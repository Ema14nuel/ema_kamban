from datetime import date, datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .clock import business_today
from .models import Board, Card, CardEvent, LogEntry, Routine


class MetricsTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user('metrics', 'metrics@example.invalid', 'Test-only-913!')
        self.other = get_user_model().objects.create_user('other', 'other@example.invalid', 'Test-only-913!')
        self.board = Board.objects.create(owner=self.user, name='Metrics', color='#123456')
        self.foreign = Board.objects.create(owner=self.other, name='Private', color='#111111')
        self.client.force_authenticate(self.user)
        self.today = date(2026, 10, 30)

    def card(self, **kwargs):
        return Card.objects.create(board=self.board, title='Fixture', **kwargs)

    def summary(self, **query):
        with patch('boards.metrics.business_today', return_value=self.today):
            return self.client.get('/api/metrics/', {'start': '2026-10-26', 'end': '2026-10-30', **query})

    def test_cohorts_future_custom_columns_and_late_recovery(self):
        due = date(2026, 10, 28)
        finished = datetime(2026, 10, 28, 16, tzinfo=dt_timezone.utc)
        self.card(origin='recurring', date=str(due), original_due_date=due, status='done', first_completed_at=finished)
        self.card(origin='recurring', date=str(due), original_due_date=due)
        self.card(date=str(due), original_due_date=due, status='done', first_completed_at=finished + timedelta(days=1))
        self.card(date=str(due), original_due_date=due, status='col-custom')
        self.card(date='2026-10-30', original_due_date=self.today)
        self.card(date='2026-11-01', original_due_date=date(2026, 11, 1), origin='recurring')
        self.card(status='done', first_completed_at=finished)
        data = self.summary().data
        self.assertEqual(data['recurring'], {'completed': 1, 'total': 2, 'percent': 50.0})
        self.assertEqual(data['punctuality'], {'completed': 1, 'total': 4, 'percent': 25.0})
        self.assertEqual(data['completed'], 3)
        self.assertEqual(data['recovered'], 1)
        self.assertEqual(data['overdue']['total'], 1)

    def test_empty_cohort_is_not_zero_percent(self):
        data = self.summary().data
        self.assertIsNone(data['recurring']['percent'])
        self.assertIsNone(data['punctuality']['percent'])

    def test_archival_preserves_commitment_and_cancelled_future_is_excluded(self):
        self.card(origin='recurring', original_due_date=date(2026, 10, 28), archived_at=datetime(2026, 10, 29, tzinfo=dt_timezone.utc))
        self.card(origin='recurring', original_due_date=date(2026, 10, 28), cancelled_at=datetime(2026, 10, 27, tzinfo=dt_timezone.utc))
        self.assertEqual(self.summary().data['recurring']['total'], 1)

    def test_ownership_input_validation_and_authentication(self):
        Card.objects.create(board=self.foreign, title='Private', status='done', first_completed_at=datetime(2026, 10, 28, tzinfo=dt_timezone.utc))
        self.assertEqual(self.summary().data['completed'], 0)
        self.assertEqual(self.summary(board=self.foreign.pk).status_code, 404)
        for query in ({'start': 'invalid'}, {'start': '2026-11-01'}, {'start': '2020-01-01'}, {'board': '-1'}):
            self.assertEqual(self.summary(**query).status_code, 400)
        self.client.force_authenticate(None)
        self.assertEqual(self.summary().status_code, 401)

    def test_bogota_midnight_and_focus_minutes(self):
        instant = datetime(2026, 10, 31, 3, tzinfo=dt_timezone.utc)
        self.card(status='done', first_completed_at=instant)
        entry = LogEntry.objects.create(owner=self.user, board=self.board, title='Focus', board_name='Metrics', color='#123456', minutes=25)
        LogEntry.objects.filter(pk=entry.pk).update(at=instant)
        data = self.summary().data
        self.assertEqual(data['completed'], 1)
        self.assertEqual(data['daily'][-1]['completed'], 1)
        self.assertEqual(data['focus_minutes'], 25)
        with patch('boards.clock.timezone.now', return_value=instant):
            self.assertEqual(business_today(), date(2026, 10, 30))

    def test_original_due_and_first_completion_survive_reschedule_and_reopen(self):
        response = self.client.post('/api/cards/', {'board': self.board.pk, 'title': 'Tracked', 'date': '2026-10-01'}, format='json')
        pk = response.data['id']
        self.client.patch(f'/api/cards/{pk}/', {'date': '2026-12-01'}, format='json')
        self.client.patch(f'/api/cards/{pk}/', {'status': 'done'}, format='json')
        card = Card.objects.get(pk=pk)
        first = card.first_completed_at
        self.assertIsNotNone(first)
        self.assertEqual(card.original_due_date, date(2026, 10, 1))
        self.client.post(f'/api/cards/{pk}/move/', {'status': 'progress'}, format='json')
        self.client.post(f'/api/cards/{pk}/move/', {'status': 'done'}, format='json')
        card.refresh_from_db()
        self.assertEqual(card.first_completed_at, first)
        self.client.patch(f'/api/cards/{pk}/', {'first_completed_at': '2020-01-01T00:00:00Z', 'origin': 'recurring', 'original_due_date': '2026-12-01'}, format='json')
        card.refresh_from_db()
        self.assertEqual(card.first_completed_at, first)
        self.assertEqual(card.origin, 'manual')
        self.assertEqual(card.original_due_date, date(2026, 10, 1))
        event = CardEvent.objects.filter(card=card, action='rescheduled').get()
        self.assertEqual(event.metadata['date']['old'], '2026-10-01')

    def test_delete_archives_without_erasing_results(self):
        card = self.card(status='done', first_completed_at=datetime(2026, 10, 28, tzinfo=dt_timezone.utc))
        self.assertEqual(self.client.delete(f'/api/cards/{card.pk}/').status_code, 204)
        card.refresh_from_db()
        self.assertIsNotNone(card.archived_at)
        self.assertEqual(self.summary().data['completed'], 1)
        self.assertEqual(self.client.get('/api/boards/').data[0]['cards'], [])

    def test_due_without_known_completion_is_reported_not_scored(self):
        self.card(status='done', original_due_date=date(2026, 10, 28))
        data = self.summary().data
        self.assertEqual(data['punctuality']['total'], 0)
        self.assertEqual(data['coverage']['unknown_completions'], 1)

    def test_historical_backfill_preserves_counts_origin_and_date_precision(self):
        from importlib import import_module
        from types import SimpleNamespace
        from django.apps import apps
        from django.db import connection
        card = self.card(date='2026-10-28', status='done', done_at='2026-10-29')
        CardEvent.objects.create(card=card, action='created', detail='Creada por programación recurrente en Pending')
        count = Card.objects.count()
        import_module('boards.migrations.0008_backfill_results').reconstruct(apps, SimpleNamespace(connection=connection))
        card.refresh_from_db()
        self.assertEqual(Card.objects.count(), count)
        self.assertEqual(card.origin, 'recurring')
        self.assertEqual(card.original_due_date, date(2026, 10, 28))
        self.assertEqual(card.due_date_precision, 'baseline')
        self.assertEqual(card.completion_precision, 'day')
