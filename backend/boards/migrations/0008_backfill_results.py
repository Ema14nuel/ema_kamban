from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from django.db import migrations


def reconstruct(apps, schema_editor):
    Card = apps.get_model('boards', 'Card')
    Event = apps.get_model('boards', 'CardEvent')
    alias = schema_editor.connection.alias
    recurring_ids = set(Event.objects.using(alias).filter(action='created', detail='Creada por programación recurrente en Pending').values_list('card_id', flat=True))
    # Existing dates are a baseline: original commitments were not stored reliably.
    zone = ZoneInfo('America/Bogota')
    for card in Card.objects.using(alias).all().iterator():
        card.origin = 'recurring' if card.routine_id or card.pk in recurring_ids else 'manual'
        card.due_date_precision = 'baseline'
        try:
            card.original_due_date = date.fromisoformat(card.date) if card.date else None
        except ValueError:
            card.original_due_date = None
        # Old human-readable events are not a guaranteed exact completion timestamp.
        # Preserve date-only precision instead of guessing from free text.
        if card.done_at:
            try:
                card.first_completed_at = datetime.combine(date.fromisoformat(card.done_at), time(12), zone)
                card.completion_precision = 'day'
            except ValueError:
                pass
        card.save(using=alias, update_fields=['origin', 'due_date_precision', 'original_due_date', 'first_completed_at', 'completion_precision'])


class Migration(migrations.Migration):
    dependencies = [('boards', '0007_card_archived_at_card_cancellation_reason_and_more')]
    operations = [migrations.RunPython(reconstruct, migrations.RunPython.noop)]
