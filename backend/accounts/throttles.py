import hashlib

from rest_framework.throttling import SimpleRateThrottle


class LoginIPThrottle(SimpleRateThrottle):
    scope = 'login_ip'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class LoginAccountThrottle(SimpleRateThrottle):
    scope = 'login_account'

    def get_cache_key(self, request, view):
        data = request.data if isinstance(request.data, dict) else {}
        email = str(data.get('email', '')).strip().casefold()
        digest = hashlib.sha256(email.encode()).hexdigest()
        return self.cache_format % {'scope': self.scope, 'ident': digest}


class SessionIPThrottle(LoginIPThrottle):
    scope = 'session_ip'
