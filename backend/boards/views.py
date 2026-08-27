from datetime import date, datetime, timedelta

from rest_framework import permissions, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Board, Card, CardEvent, CardNote, Column, LogEntry, Routine
from .serializers import (
    BoardSerializer,
    CardEventSerializer,
    CardNoteSerializer,
    CardSerializer,
    ColumnSerializer,
    LogEntrySerializer,
    RoutineSerializer,
)

DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
FIXED_STATUSES = {'pending', 'progress', 'waiting', 'done'}
STATUS_LABELS = {'pending': 'Pending', 'progress': 'In Progress', 'waiting': 'Waiting', 'done': 'Completed'}
EDITABLE_FIELD_LABELS = {'title': 'Título', 'desc': 'Descripción', 'date': 'Fecha', 'time': 'Hora'}


def valid_statuses(board):
    return FIXED_STATUSES | set(board.columns.values_list('key', flat=True))


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
        return Board.objects.filter(owner=self.request.user).prefetch_related('cards', 'columns')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ColumnViewSet(viewsets.ModelViewSet):
    serializer_class = ColumnSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Column.objects.filter(board__owner=self.request.user)

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

    def perform_destroy(self, instance):
        # Las tarjetas que estaban en esta columna vuelven a Pending en vez
        # de perderse.
        Card.objects.filter(board=instance.board, status=instance.key).update(status='pending')
        instance.delete()


class CardViewSet(viewsets.ModelViewSet):
    serializer_class = CardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Card.objects.filter(board__owner=self.request.user)
        board_id = self.request.query_params.get('board')
        if board_id:
            qs = qs.filter(board_id=board_id)
        return qs

    def perform_create(self, serializer):
        board = serializer.validated_data['board']
        if board.owner_id != self.request.user.id:
            raise PermissionDenied()
        card = serializer.save()
        CardEvent.objects.create(card=card, action='created', detail=f'Creada en {status_label(board, card.status)}')

    def perform_update(self, serializer):
        old = serializer.instance
        old_values = {field: getattr(old, field) for field in EDITABLE_FIELD_LABELS}
        card = serializer.save()
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
            CardEvent.objects.create(card=card, action='edited', detail='; '.join(changes))

    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        card = self.get_object()
        to_status = request.data.get('status')
        if to_status not in valid_statuses(card.board):
            return Response({'detail': 'estado invalido'}, status=400)
        from_status = card.status
        card.status = to_status
        if to_status == 'done':
            card.done_at = date.today().isoformat()
        card.save(update_fields=['status', 'done_at'])
        if from_status != to_status:
            CardEvent.objects.create(
                card=card, action='moved',
                detail=f'{status_label(card.board, from_status)} → {status_label(card.board, to_status)}',
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
            text = (request.data.get('text') or '').strip()
            if not text:
                return Response({'detail': 'texto requerido'}, status=400)
            note = CardNote.objects.create(card=card, text=text)
            return Response(CardNoteSerializer(note).data, status=201)
        notes = CardNote.objects.filter(card=card).order_by('-created_at')
        return Response(CardNoteSerializer(notes, many=True).data)

    @action(detail=True, methods=['post'])
    def complete_pomodoro(self, request, pk=None):
        card = self.get_object()
        minutes = int(request.data.get('minutes', 25))
        card.pomos = (card.pomos or 0) + 1
        card.save(update_fields=['pomos'])
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
        cards_to_create = [
            Card(board=board, routine=routine, status='pending', title=title, desc=desc, date=iso_date, time=time_val)
            for iso_date, time_val, desc in days_to_create
        ]
        created_cards = Card.objects.bulk_create(cards_to_create)
        CardEvent.objects.bulk_create(
            [CardEvent(card=c, action='created', detail='Creada por programación recurrente en Pending') for c in created_cards]
        )
        return Response(RoutineSerializer(routine).data, status=201)

    def perform_destroy(self, instance):
        # Regla de negocio: borrar una programación recurrente borra sus
        # tarjetas de los tableros, PERO las que ya se completaron o las que
        # se perdieron (fecha pasada sin completar) quedan — solo se ven en
        # Histórico a partir de ahí, ya no en ningún tablero activo.
        #
        # "Hoy" lo manda el cliente (?today=YYYY-MM-DD, en su hora local) en
        # vez de usar date.today() del servidor: el contenedor corre en UTC,
        # así que cerca de la medianoche el "hoy" del servidor y el del
        # navegador pueden diferir en un día, y este corte tiene que coincidir
        # exactamente con lo que el usuario ve como "perdida" en su pantalla.
        today = self.request.query_params.get('today') or date.today().isoformat()
        cards = Card.objects.filter(routine=instance)
        keep_ids = [c.id for c in cards if c.status == 'done' or (c.date and c.date < today)]
        cards.exclude(id__in=keep_ids).delete()
        # SET_NULL en Card.routine desvincula automáticamente las que se
        # conservan al borrar esta Routine.
        instance.delete()


class LogEntryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LogEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LogEntry.objects.filter(owner=self.request.user)
