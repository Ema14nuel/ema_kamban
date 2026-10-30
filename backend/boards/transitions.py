from datetime import date

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .clock import business_today


def apply_transition(card, target):
    """Called under a board lock and atomic transaction by every write route."""
    previous = card.status
    if card.is_expired_recurring and target != previous:
        raise ValidationError('Esta actividad recurrente venció y no se puede recuperar.')
    card.status = target
    if target == 'done' and previous != 'done':
        card.done_at = business_today().isoformat()
        if card.first_completed_at is None:
            card.first_completed_at = timezone.now()
            card.completion_precision = 'exact'
    elif previous == 'done' and target != 'done':
        card.done_at = ''


def capture_commitment(card):
    if card.date and card.original_due_date is None:
        card.original_due_date = date.fromisoformat(card.date)
        card.due_date_precision = 'exact'
