from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase
from .models import Board, Card, CardEvent, Column, LogEntry, Routine


class BoardSecurityTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user('one', 'one@example.invalid', 'Synthetic-password-913!')
        self.other = get_user_model().objects.create_user('two', 'two@example.invalid', 'Synthetic-password-913!')
        self.board = Board.objects.create(owner=self.user, name='Synthetic', color='#123456')
        self.foreign = Board.objects.create(owner=self.other, name='Other synthetic', color='#123456')
        self.card = Card.objects.create(board=self.board, title='Synthetic card')
        self.column = Column.objects.create(board=self.board, key='col-test', title='Synthetic column')
        self.days = {'mon': {'on': True, 'mode': 'fixed', 'time': '09:00'}}
        self.routine = Routine.objects.create(board=self.board, title='Synthetic routine', date_from='2026-10-26', date_to='2026-10-27', days=self.days)
        self.client.force_authenticate(self.user)

    def payload(self, **kwargs):
        return {'board': self.board.pk, 'title': 'Synthetic routine', 'date_from': '2026-10-26', 'date_to': '2026-10-27', 'days': self.days, **kwargs}

    def test_foreign_objects_and_actions_are_denied(self):
        card = Card.objects.create(board=self.foreign, title='Private synthetic')
        for method in ('get', 'patch', 'delete'):
            self.assertEqual(getattr(self.client, method)(f'/api/cards/{card.pk}/', {'title': 'changed'}, format='json').status_code, 404)
        for action, body in [('move', {'status': 'done'}), ('notes', {'text': 'note'}), ('complete_pomodoro', {})]:
            self.assertEqual(self.client.post(f'/api/cards/{card.pk}/{action}/', body, format='json').status_code, 404)
        self.assertEqual(self.client.get(f'/api/cards/{card.pk}/history/').status_code, 404)
        self.assertEqual([b['id'] for b in self.client.get('/api/boards/').data], [self.board.pk])

    def test_board_immutable_for_put_and_patch(self):
        owned = Board.objects.create(owner=self.user, name='Owned two', color='#123456')
        for endpoint, obj, fields in [('cards', self.card, {'title': 'card', 'status': 'pending'}), ('columns', self.column, {'title': 'column'}), ('routines', self.routine, self.payload())]:
            for method in ('put', 'patch'):
                for destination in (self.foreign, owned):
                    with self.subTest(endpoint=endpoint, method=method, destination=destination.pk):
                        response = getattr(self.client, method)(f'/api/{endpoint}/{obj.pk}/', {**fields, 'board': destination.pk}, format='json')
                        self.assertEqual(response.status_code, 400)
                        obj.refresh_from_db()
                        self.assertEqual(obj.board_id, self.board.pk)

    def test_foreign_board_create_rejected(self):
        for endpoint, fields in [('cards', {'title': 'card'}), ('columns', {'title': 'column'}), ('routines', self.payload())]:
            self.assertEqual(self.client.post(f'/api/{endpoint}/', {**fields, 'board': self.foreign.pk}, format='json').status_code, 400)

    def test_own_crud_and_default_status(self):
        response = self.client.post('/api/cards/', {'board': self.board.pk, 'title': 'New'}, format='json')
        self.assertEqual(response.status_code, 201)
        card_id = response.data['id']
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(self.client.patch(f'/api/cards/{card_id}/', {'title': 'Updated'}, format='json').status_code, 200)
        moved = self.client.post(f'/api/cards/{card_id}/move/', {'status': 'done', 'position': 0}, format='json')
        self.assertEqual(moved.status_code, 200)
        self.assertTrue(moved.data['done_at'])
        self.assertEqual(self.client.delete(f'/api/cards/{card_id}/').status_code, 204)

    def test_invalid_actions_have_no_side_effects(self):
        for value in ('bad', -1, 0, 181, None, {}, []):
            with self.subTest(minutes=value):
                self.assertEqual(self.client.post(f'/api/cards/{self.card.pk}/complete_pomodoro/', {'minutes': value}, format='json').status_code, 400)
        for body in ({'status': []}, {'status': 'missing'}, {'status': 'done', 'position': {}}, {'status': 'done', 'position': -1}):
            self.assertEqual(self.client.post(f'/api/cards/{self.card.pk}/move/', body, format='json').status_code, 400)
        for text in ({}, [], '', ' '):
            self.assertEqual(self.client.post(f'/api/cards/{self.card.pk}/notes/', {'text': text}, format='json').status_code, 400)
        self.card.refresh_from_db()
        self.assertEqual(self.card.pomos, 0)
        self.assertFalse(LogEntry.objects.exists())

    def test_date_time_validation(self):
        for values in ({'date': '2026-02-30'}, {'time': '25:00'}, {'date': '20261027'}):
            self.assertEqual(self.client.patch(f'/api/cards/{self.card.pk}/', values, format='json').status_code, 400)

    def test_note_and_pomodoro_success(self):
        self.assertEqual(self.client.post(f'/api/cards/{self.card.pk}/notes/', {'text': 'Synthetic note'}, format='json').status_code, 201)
        response = self.client.post(f'/api/cards/{self.card.pk}/complete_pomodoro/', {'minutes': 25}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['card']['pomos'], 1)
        self.assertEqual(LogEntry.objects.get().owner_id, self.user.pk)

    def test_pomodoro_failure_rolls_back(self):
        with patch('boards.views.LogEntry.objects.create', side_effect=RuntimeError('synthetic failure')):
            with self.assertRaises(RuntimeError):
                self.client.post(f'/api/cards/{self.card.pk}/complete_pomodoro/', {}, format='json')
        self.card.refresh_from_db()
        self.assertEqual(self.card.pomos, 0)

    def test_move_event_failure_rolls_back(self):
        with patch('boards.views.CardEvent.objects.create', side_effect=RuntimeError('synthetic failure')):
            with self.assertRaises(RuntimeError):
                self.client.post(f'/api/cards/{self.card.pk}/move/', {'status': 'done'}, format='json')
        self.card.refresh_from_db()
        self.assertEqual(self.card.status, 'pending')

    def test_routine_schema_and_range(self):
        for days in ([], None, {'mon': []}, {'mon': {'on': 'yes'}}, {'foo': {'on': True}}, {'mon': {'on': True, 'mode': 'fixed', 'time': '99:99'}}, {'mon': {'on': True, 'mode': 'range', 'start': '10:00', 'end': '09:00'}}):
            self.assertEqual(self.client.post('/api/routines/', self.payload(days=days), format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/routines/', self.payload(date_to='9999-12-31'), format='json').status_code, 400)
        response = self.client.post('/api/routines/', self.payload(), format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['count'], 1)

    def test_routine_failure_rolls_back(self):
        before = Routine.objects.count()
        with patch('boards.views.CardEvent.objects.bulk_create', side_effect=RuntimeError('synthetic failure')):
            with self.assertRaises(RuntimeError):
                self.client.post('/api/routines/', self.payload(), format='json')
        self.assertEqual(Routine.objects.count(), before)
        self.assertFalse(Card.objects.filter(routine__isnull=False).exists())

    def test_delete_validates_today(self):
        self.assertEqual(self.client.delete(f'/api/routines/{self.routine.pk}/?today=invalid').status_code, 400)
        self.assertTrue(Routine.objects.filter(pk=self.routine.pk).exists())

    def test_long_event_detail_is_bounded(self):
        self.card.title = 'x' * 200
        self.card.save()
        self.assertEqual(self.client.patch(f'/api/cards/{self.card.pk}/', {'title': 'y' * 200}, format='json').status_code, 200)
        self.assertLessEqual(len(CardEvent.objects.get().detail), 300)
