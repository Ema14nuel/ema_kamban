from io import BytesIO
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APITestCase

User = get_user_model()
PASSWORD = 'Synthetic-password-913!'


class AccountSecurityTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.normal = User.objects.create_user('normal', 'normal@example.invalid', PASSWORD)
        self.staff = User.objects.create_user('staff', 'staff@example.invalid', PASSWORD, is_staff=True)
        self.root = User.objects.create_superuser('root', 'root@example.invalid', PASSWORD)

    def login(self):
        response = self.client.post('/api/auth/login/', {'email': self.normal.email, 'password': PASSWORD}, format='json')
        self.assertEqual(response.status_code, 200)
        return response.data

    def bearer(self, token):
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_normal_cannot_admin_or_escalate_profile(self):
        self.client.force_authenticate(self.normal)
        self.assertEqual(self.client.get('/api/users/').status_code, 403)
        self.assertEqual(self.client.patch('/api/auth/me/', {'is_staff': True}, format='json').status_code, 200)
        self.normal.refresh_from_db()
        self.assertFalse(self.normal.is_staff)

    def test_staff_cannot_modify_privileged_users(self):
        self.client.force_authenticate(self.staff)
        for target in (self.staff, self.root):
            for method in ('get', 'put', 'patch', 'delete'):
                response = getattr(self.client, method)(f'/api/users/{target.pk}/', {'username': 'changed', 'email': 'changed@example.invalid', 'password': 'New-synthetic-751!'}, format='json')
                self.assertEqual(response.status_code, 404)
        self.root.refresh_from_db()
        self.assertTrue(self.root.check_password(PASSWORD))

    def test_staff_cannot_grant_roles(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.patch(f'/api/users/{self.normal.pk}/', {'is_staff': True}, format='json').status_code, 403)
        self.assertEqual(self.client.post('/api/users/', {'username': 'new', 'email': 'new@example.invalid', 'password': PASSWORD, 'is_staff': True}, format='json').status_code, 403)

    def test_staff_can_manage_normal_and_root_can_manage_staff(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.patch(f'/api/users/{self.normal.pk}/', {'first_name': 'Synthetic'}, format='json').status_code, 200)
        self.assertEqual(self.client.delete(f'/api/users/{self.normal.pk}/').status_code, 204)
        self.client.force_authenticate(self.root)
        self.assertEqual(self.client.patch(f'/api/users/{self.staff.pk}/', {'is_staff': False}, format='json').status_code, 200)

    def test_rotation_rejects_replay(self):
        tokens = self.login()
        self.bearer(tokens['access'])
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 200)
        self.client.credentials()
        response = self.client.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(tokens['refresh'], response.data['refresh'])
        self.assertEqual(self.client.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json').status_code, 401)
        self.bearer(response.data['access'])
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 200)

    def test_logout_revokes_all_sessions_and_new_login_works(self):
        one, two = self.login(), self.login()
        self.assertEqual(self.client.post('/api/auth/logout/', {'refresh': one['refresh']}, format='json').status_code, 204)
        for tokens in (one, two):
            self.bearer(tokens['access'])
            self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)
            self.client.credentials()
            self.assertEqual(self.client.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json').status_code, 401)
        fresh = self.login()
        self.bearer(fresh['access'])
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 200)

    def test_password_change_revokes_access_and_refresh(self):
        tokens = self.login()
        self.normal.set_password('Changed-synthetic-password-919!')
        self.normal.save()
        self.bearer(tokens['access'])
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)
        self.client.credentials()
        self.assertEqual(self.client.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json').status_code, 401)

    def test_logout_during_rotation_accepts_valid_access(self):
        tokens = self.login()
        rotated = self.client.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(rotated.status_code, 200)
        self.assertEqual(self.client.post('/api/auth/logout/', tokens, format='json').status_code, 204)
        self.bearer(rotated.data['access'])
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_profile_update_preserves_current_auth_version(self):
        self.normal.auth_version = 3
        self.normal.save(update_fields=['auth_version'])
        stale = User.objects.get(pk=self.normal.pk)
        User.objects.filter(pk=self.normal.pk).update(auth_version=4)
        self.client.force_authenticate(stale)
        self.assertEqual(self.client.patch('/api/auth/me/', {'first_name': 'Synthetic'}, format='json').status_code, 200)
        self.normal.refresh_from_db()
        self.assertEqual(self.normal.auth_version, 4)

    def test_inactive_and_deleted_user_cannot_refresh(self):
        tokens = self.login()
        self.normal.is_active = False
        self.normal.save()
        self.assertEqual(self.client.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json').status_code, 401)
        self.normal.delete()
        self.assertEqual(self.client.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json').status_code, 401)

    def test_invalid_logout_does_not_revoke(self):
        self.assertIn(self.client.post('/api/auth/logout/', {'refresh': 'invalid'}, format='json').status_code, (401, 403))
        self.normal.refresh_from_db()
        self.assertEqual(self.normal.auth_version, 0)

    def test_login_throttles_account_and_ip(self):
        for i in range(10):
            response = self.client.post('/api/auth/login/', {'email': 'missing@example.invalid', 'password': 'bad'}, format='json', REMOTE_ADDR=f'192.0.2.{i+1}')
            self.assertEqual(response.status_code, 401)
        self.assertEqual(self.client.post('/api/auth/login/', {'email': 'missing@example.invalid', 'password': 'bad'}, format='json', REMOTE_ADDR='192.0.2.99').status_code, 429)
        cache.clear()
        for i in range(30):
            self.client.post('/api/auth/login/', {'email': f'missing{i}@example.invalid', 'password': 'bad'}, format='json')
        self.assertEqual(self.client.post('/api/auth/login/', {'email': 'other@example.invalid', 'password': 'bad'}, format='json').status_code, 429)

    def test_avatar_canonical_and_restricted(self):
        self.client.force_authenticate(self.normal)
        output = BytesIO()
        Image.new('RGB', (4, 4), 'red').save(output, 'JPEG')
        good = SimpleUploadedFile('synthetic.jpg', output.getvalue(), content_type='image/jpeg')
        self.assertEqual(self.client.patch('/api/auth/me/', {'avatar': good}, format='multipart').status_code, 200)
        self.normal.refresh_from_db()
        self.assertTrue(self.normal.avatar.name.endswith('.png'))
        with self.normal.avatar.open('rb') as stored:
            self.assertEqual(stored.read(8), b'\x89PNG\r\n\x1a\n'.decode('unicode_escape').encode('latin1'))
        for content in (b'not an image', b'GIF89a harmless rejected fixture', b'x' * (2*1024*1024+1)):
            bad = SimpleUploadedFile('synthetic.png', content, content_type='image/png')
            self.assertEqual(self.client.patch('/api/auth/me/', {'avatar': bad}, format='multipart').status_code, 400)

    def test_large_dimensions_rejected(self):
        self.client.force_authenticate(self.normal)
        output = BytesIO()
        Image.new('RGB', (2049, 1)).save(output, 'PNG')
        image = SimpleUploadedFile('wide.png', output.getvalue(), content_type='image/png')
        self.assertEqual(self.client.patch('/api/auth/me/', {'avatar': image}, format='multipart').status_code, 400)
