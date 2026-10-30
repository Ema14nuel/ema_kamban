from datetime import date, timedelta

from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .clock import BUSINESS_ZONE, business_date, business_today
from .models import Board, Card, LogEntry


class MetricsInput(serializers.Serializer):
    start = serializers.DateField(required=False)
    end = serializers.DateField(required=False)
    board = serializers.IntegerField(min_value=1, required=False)


def ratio(numerator, denominator):
    return {'completed': numerator, 'total': denominator, 'percent': round(numerator * 100 / denominator, 1) if denominator else None}


def summarize(cards, start, end, today):
    recurring_total = recurring_done = due_total = due_done = completed = recovered = 0
    overdue = {'one_two': 0, 'three_seven': 0, 'over_seven': 0}
    baseline = unknown = 0
    daily = {start + timedelta(days=i): 0 for i in range((end - start).days + 1)}
    for card in cards:
        if card.cancelled_at:
            continue
        finished = business_date(card.first_completed_at) if card.first_completed_at else None
        due = card.original_due_date
        # Closed commitments plus early completions; never count tomorrow's work.
        evaluable = due and start <= due <= end and due <= today and (due < today or finished is not None)
        if evaluable:
            if card.status == 'done' and finished is None:
                unknown += 1
                continue
            on_time = finished is not None and finished <= due
            due_total += 1
            due_done += int(on_time)
            baseline += int(card.due_date_precision == 'baseline')
            if card.is_recurring:
                recurring_total += 1
                recurring_done += int(on_time)
        if finished and start <= finished <= end:
            completed += 1
            daily[finished] += 1
            recovered += int(not card.is_recurring and due is not None and finished > due)
        if not card.is_recurring and card.status != 'done' and not card.archived_at and card.date:
            try:
                age = (today - date.fromisoformat(card.date)).days
            except ValueError:
                continue
            if age > 0:
                overdue['one_two' if age <= 2 else 'three_seven' if age <= 7 else 'over_seven'] += 1
    return {
        'recurring': ratio(recurring_done, recurring_total),
        'punctuality': ratio(due_done, due_total),
        'completed': completed, 'recovered': recovered,
        'overdue': {'total': sum(overdue.values()), **overdue},
        'daily': [{'date': day.isoformat(), 'completed': count} for day, count in daily.items()],
        'coverage': {'baseline_commitments': baseline, 'unknown_completions': unknown},
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def metrics(request):
    incoming = MetricsInput(data=request.query_params)
    incoming.is_valid(raise_exception=True)
    today = business_today()
    start = incoming.validated_data.get('start', today - timedelta(days=today.weekday()))
    end = incoming.validated_data.get('end', today)
    if end < start or (end - start).days > 365:
        raise serializers.ValidationError('Selecciona un período de hasta 366 días con fechas ordenadas.')
    boards = Board.objects.filter(owner=request.user)
    if 'board' in incoming.validated_data:
        boards = boards.filter(pk=incoming.validated_data['board'])
        if not boards.exists():
            raise NotFound('Tablero no disponible.')
    boards = list(boards)
    cards = list(Card.objects.filter(board_id__in=[b.pk for b in boards]))
    # Origin was backfilled and is persisted: no event query per activity.
    for card in cards:
        card._recurring_origin = card.origin == 'recurring'
    result = summarize(cards, start, end, today)
    logs = LogEntry.objects.filter(owner=request.user, at__date__gte=start - timedelta(days=1), at__date__lte=end + timedelta(days=1))
    if 'board' in incoming.validated_data:
        logs = logs.filter(board_id=incoming.validated_data['board'])
    # Explicit local-date boundaries also handle UTC events around midnight.
    result['focus_minutes'] = sum(row.minutes for row in logs.only('minutes', 'at') if start <= business_date(row.at) <= end)
    result['boards'] = [{'id': b.pk, 'name': b.name, 'color': b.color, **summarize([c for c in cards if c.board_id == b.pk], start, end, today)} for b in boards]
    result.update({'start': start.isoformat(), 'end': end.isoformat(), 'today': today.isoformat(), 'timezone': str(BUSINESS_ZONE), 'calculated_at': timezone.now().isoformat(), 'rules_version': 1})
    return Response(result)
