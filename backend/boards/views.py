from datetime import date, datetime, timedelta

from django.db import models, transaction
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Board, Card, CardEvent, CardNote, Column, LogEntry, Routine
from .clock import business_today
from .transitions import apply_transition, capture_commitment
from .serializers import (
    BoardSerializer,
    CardEventSerializer,
    CardNoteSerializer,
    CardSerializer,
    ColumnSerializer,
    LogEntrySerializer,
    RoutineSerializer,
    PomodoroInputSerializer,
    MoveInputSerializer,
    TodayInputSerializer,
)

DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
FIXED_STATUSES = {'pending', 'progress', 'waiting', 'done'}
STATUS_LABELS = {'pending': 'Pending', 'progress': 'In Progress', 'waiting': 'Waiting', 'done': 'Completed'}
EDITABLE_FIELD_LABELS = {'title': 'Título', 'desc': 'Descripción', 'date': 'Fecha', 'time': 'Hora'}


def valid_statuses(board):
    return FIXED_STATUSES | set(board.columns.values_list('key', flat=True))


def cards_with_recurrence():
    # The creation event preserves origin after deleting a routine (SET_NULL).
    return Card.objects.annotate(_recurring_origin=models.Exists(
        CardEvent.objects.filter(card_id=models.OuterRef('pk'), action='created', detail='Creada por programación recurrente en Pending')
    ))


def status_label(board, status):
    if status in STATUS_LABELS:
        return STATUS_LABELS[status]
    column = board.columns.filter(key=status).first()
    return column.title if column else status


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({'status': 'ok', 'service': 'kamban_backend'})


class BoardViewSet(viewsets.ModelViewSet):
    serializer_class = BoardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Board.objects.filter(owner=self.request.user).prefetch_related(models.Prefetch('cards', queryset=cards_with_recurrence().filter(archived_at__isnull=True, cancelled_at__isnull=True)), 'columns')

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ColumnViewSet(viewsets.ModelViewSet):
    serializer_class = ColumnSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Column.objects.filter(board__owner=self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        board = serializer.validated_data['board']
        if board.owner_id != self.request.user.id:
            raise PermissionDenied()
        order = Column.objects.filter(board=board).count()
        column = serializer.save(order=order)
        # La key se arma con el id ya asignado, así nunca choca con las 4
        # fijas ni con otra columna.
        column.key = f'col-{column.id}'
        column.save(update_fields=['key'])

    @transaction.atomic
    def perform_destroy(self, instance):
        # Las tarjetas que estaban en esta columna vuelven a Pending en vez
        # de perderse.
        Card.objects.filter(board=instance.board, status=instance.key).update(status='pending')
        instance.delete()


class CardViewSet(viewsets.ModelViewSet):
    serializer_class = CardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = cards_with_recurrence().filter(board__owner=self.request.user, archived_at__isnull=True, cancelled_at__isnull=True)
        board_id = self.request.query_params.get('board')
        if board_id:
            qs = qs.filter(board_id=board_id)
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        board = serializer.validated_data['board']
        if board.owner_id != self.request.user.id:
            raise PermissionDenied()
        Board.objects.select_for_update().get(pk=board.pk)
        order = Card.objects.filter(board=board, status=serializer.validated_data.get('status', 'pending')).count()
        card = serializer.save(order=order)
        capture_commitment(card)
        if card.status == 'done':
            card.status = 'pending'
            apply_transition(card, 'done')
        card.save()
        CardEvent.objects.create(card=card, action='created', detail=f'Creada en {status_label(board, card.status)}')

    @transaction.atomic
    def perform_update(self, serializer):
        Board.objects.select_for_update().get(pk=serializer.instance.board_id)
        serializer.instance.refresh_from_db()
        old = serializer.instance
        old_values = {field: getattr(old, field) for field in EDITABLE_FIELD_LABELS}
        previous_status = old.status
        target_status = serializer.validated_data.pop('status', previous_status)
        # Recheck after locking: the original serializer validation may be stale.
        if old.is_expired_recurring and (target_status != previous_status or any(field in serializer.validated_data and serializer.validated_data[field] != getattr(old, field) for field in ('date', 'time'))):
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Esta actividad recurrente venció y no se puede recuperar ni reprogramar.')
        apply_transition(old, target_status)
        card = serializer.save()
        capture_commitment(card)
        card.save()
        changes = []
        for field, label in EDITABLE_FIELD_LABELS.items():
            new_value = getattr(card, field)
            if old_values[field] == new_value:
                continue
            if field == 'desc':
                changes.append('Descripción actualizada')
            else:
                changes.append(f'{label}: "{old_values[field]}" → "{new_value}"')
        if changes:
            CardEvent.objects.create(card=card, action='rescheduled' if old_values['date'] != card.date else 'edited', detail='; '.join(changes)[:300], metadata={field: {'old': old_values[field], 'new': getattr(card, field)} for field in EDITABLE_FIELD_LABELS if old_values[field] != getattr(card, field)})
        if previous_status != target_status:
            CardEvent.objects.create(card=card, action='completed' if target_status == 'done' else 'reopened' if previous_status == 'done' else 'moved', detail=f'{previous_status} → {target_status}', metadata={'from_status': previous_status, 'to_status': target_status})

    @transaction.atomic
    def perform_destroy(self, instance):
        Board.objects.select_for_update().get(pk=instance.board_id)
        instance.refresh_from_db()
        instance.archived_at = timezone.now()
        instance.save(update_fields=['archived_at'])
        CardEvent.objects.create(card=instance, action='archived', detail='Actividad archivada; se conserva para indicadores')

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def move(self, request, pk=None):
        card = self.get_object()
        Board.objects.select_for_update().get(pk=card.board_id, owner=request.user)
        card.refresh_from_db()
        if card.is_expired_recurring:
            return Response({'detail': 'Esta actividad recurrente venció y no se puede recuperar.'}, status=400)
        incoming = MoveInputSerializer(data=request.data)
        incoming.is_valid(raise_exception=True)
        to_status = incoming.validated_data['status']
        if to_status not in valid_statuses(card.board):
            return Response({'detail': 'estado invalido'}, status=400)
        from_status = card.status
        position = incoming.validated_data.get('position', Card.objects.filter(board=card.board, status=to_status).exclude(pk=card.pk).count())
        with transaction.atomic():
            # Se saca primero de su lista y se compacta; después se abre un
            # hueco en destino. Así funciona tanto al mover de columna como
            # al reordenar en la misma columna.
            Card.objects.filter(board=card.board, status=from_status, order__gt=card.order).update(order=models.F('order') - 1)
            destination = Card.objects.filter(board=card.board, status=to_status).exclude(pk=card.pk)
            if from_status == to_status and position > card.order:
                position -= 1
            position = max(0, min(position, destination.count()))
            destination.filter(order__gte=position).update(order=models.F('order') + 1)
            apply_transition(card, to_status)
            card.order = position
            card.save(update_fields=['status', 'order', 'done_at', 'first_completed_at', 'completion_precision'])
        if from_status != to_status:
            CardEvent.objects.create(
                card=card, action='moved',
                detail=f'{status_label(card.board, from_status)} → {status_label(card.board, to_status)}',
                metadata={'from_status': from_status, 'to_status': to_status},
            )
        return Response(CardSerializer(card).data)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        card = self.get_object()
        events = CardEvent.objects.filter(card=card).order_by('-at')
        return Response(CardEventSerializer(events, many=True).data)

    @action(detail=True, methods=['get', 'post'])
    def notes(self, request, pk=None):
        card = self.get_object()
        if request.method == 'POST':
            incoming = CardNoteSerializer(data=request.data)
            incoming.is_valid(raise_exception=True)
            note = incoming.save(card=card)
            return Response(CardNoteSerializer(note).data, status=201)
        notes = CardNote.objects.filter(card=card).order_by('-created_at')
        return Response(CardNoteSerializer(notes, many=True).data)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def complete_pomodoro(self, request, pk=None):
        incoming = PomodoroInputSerializer(data=request.data)
        incoming.is_valid(raise_exception=True)
        minutes = incoming.validated_data['minutes']
        card = self.get_object()
        if card.is_expired_recurring:
            return Response({'detail': 'Esta actividad recurrente venció y no se puede recuperar.'}, status=400)
        Card.objects.filter(pk=card.pk).update(pomos=models.F('pomos') + 1)
        card.refresh_from_db()
        entry = LogEntry.objects.create(
            owner=request.user,
            card=card,
            board=card.board,
            title=card.title,
            board_name=card.board.name,
            color=card.board.color,
            minutes=minutes,
        )
        return Response({'card': CardSerializer(card).data, 'entry': LogEntrySerializer(entry).data})


class RoutineViewSet(viewsets.ModelViewSet):
    serializer_class = RoutineSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Routine.objects.filter(board__owner=self.request.user)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        board = serializer.validated_data['board']
        if board.owner_id != request.user.id:
            raise PermissionDenied()

        title = serializer.validated_data['title'].strip()
        description = serializer.validated_data.get('description', '').strip()
        date_from = serializer.validated_data['date_from']
        date_to = serializer.validated_data['date_to']
        days = serializer.validated_data['days']

        try:
            start = datetime.strptime(date_from, '%Y-%m-%d').date()
            end = datetime.strptime(date_to, '%Y-%m-%d').date()
        except ValueError:
            return Response({'detail': 'fechas invalidas'}, status=400)

        if end < start or not title:
            return Response({'detail': 'rango de fechas invalido'}, status=400)

        # Primero se arma la lista en memoria (sin tocar la BD) para saber si
        # hay algo que crear antes de comprometernos a guardar la Routine.
        days_to_create = []
        d = start
        while d <= end and len(days_to_create) < 400:
            cfg = days.get(DAY_KEYS[d.weekday()])
            if cfg and cfg.get('on'):
                if cfg.get('mode') == 'range':
                    time_val = cfg.get('start', '')
                    range_note = f"Entre {cfg.get('start', '')} y {cfg.get('end', '')}"
                else:
                    time_val = cfg.get('time', '')
                    range_note = ''
                desc = '\n\n'.join(part for part in [description, range_note] if part)
                days_to_create.append((d.isoformat(), time_val, desc))
            if d == end:
                break
            d += timedelta(days=1)

        if not days_to_create:
            return Response({'detail': 'no se genero ninguna actividad con ese horario'}, status=400)

        # La Routine se crea antes que las Card para poder enlazarlas — así,
        # si más adelante se borra la programación, sabemos cuáles tarjetas
        # borrar en cascada y cuáles conservar (ver perform_destroy).
        routine = Routine.objects.create(
            board=board, title=title, description=description, date_from=date_from, date_to=date_to,
            days=days, count=len(days_to_create),
        )
        first_order = Card.objects.filter(board=board, status='pending').count()
        cards_to_create = [
            Card(board=board, routine=routine, origin='recurring', original_due_date=date.fromisoformat(iso_date), status='pending', title=title, desc=desc, date=iso_date, time=time_val, order=first_order + index)
            for index, (iso_date, time_val, desc) in enumerate(days_to_create)
        ]
        created_cards = Card.objects.bulk_create(cards_to_create)
        CardEvent.objects.bulk_create(
            [CardEvent(card=c, action='created', detail='Creada por programación recurrente en Pending') for c in created_cards]
        )
        return Response(RoutineSerializer(routine).data, status=201)

    @transaction.atomic
    def perform_destroy(self, instance):
        # Validate legacy callers' query, but calculate the cut in Bogotá on
        # the server. Deleting a routine cannot erase expired commitments.
        incoming = TodayInputSerializer(data=self.request.query_params)
        incoming.is_valid(raise_exception=True)
        today = business_today().isoformat()
        cards = Card.objects.filter(routine=instance)
        # Cancel only future untouched occurrences. Past commitments remain measurable.
        future = cards.filter(date__gt=today, status='pending', pomos=0, first_completed_at__isnull=True)
        future = future.exclude(events__action__in=['moved', 'completed', 'reopened'])
        ids = list(future.values_list('pk', flat=True))
        Card.objects.filter(pk__in=ids).update(cancelled_at=timezone.now(), cancellation_reason='Programación eliminada antes del inicio')
        CardEvent.objects.bulk_create([CardEvent(card_id=pk, action='cancelled', detail='Ocurrencia futura cancelada al eliminar la programación') for pk in ids])
        # SET_NULL en Card.routine desvincula automáticamente las que se
        # conservan al borrar esta Routine.
        instance.delete()


class LogEntryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LogEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LogEntry.objects.filter(owner=self.request.user)
