from datetime import date, datetime, timedelta

from rest_framework import permissions, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Board, Card, CardEvent, LogEntry, Routine
from .serializers import BoardSerializer, CardEventSerializer, CardSerializer, LogEntrySerializer, RoutineSerializer

DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
VALID_STATUSES = {'pending', 'progress', 'waiting', 'done'}
STATUS_LABELS = {'pending': 'Pending', 'progress': 'In Progress', 'waiting': 'Waiting', 'done': 'Completed'}
EDITABLE_FIELD_LABELS = {'title': 'Título', 'desc': 'Descripción', 'date': 'Fecha', 'time': 'Hora'}


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({'status': 'ok', 'service': 'kamban_backend'})


class BoardViewSet(viewsets.ModelViewSet):
    serializer_class = BoardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Board.objects.filter(owner=self.request.user).prefetch_related('cards')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


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
        CardEvent.objects.create(card=card, action='created', detail=f'Creada en {STATUS_LABELS.get(card.status, card.status)}')

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
        if to_status not in VALID_STATUSES:
            return Response({'detail': 'estado invalido'}, status=400)
        from_status = card.status
        card.status = to_status
        if to_status == 'done':
            card.done_at = date.today().isoformat()
        card.save(update_fields=['status', 'done_at'])
        if from_status != to_status:
            CardEvent.objects.create(
                card=card, action='moved',
                detail=f'{STATUS_LABELS.get(from_status, from_status)} → {STATUS_LABELS.get(to_status, to_status)}',
            )
        return Response(CardSerializer(card).data)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        card = self.get_object()
        events = CardEvent.objects.filter(card=card).order_by('-at')
        return Response(CardEventSerializer(events, many=True).data)

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

        cards_to_create = []
        d = start
        while d <= end and len(cards_to_create) < 400:
            cfg = days.get(DAY_KEYS[d.weekday()])
            if cfg and cfg.get('on'):
                if cfg.get('mode') == 'range':
                    time_val = cfg.get('start', '')
                    desc = f"Entre {cfg.get('start', '')} y {cfg.get('end', '')}"
                else:
                    time_val = cfg.get('time', '')
                    desc = ''
                cards_to_create.append(
                    Card(board=board, status='pending', title=title, desc=desc, date=d.isoformat(), time=time_val)
                )
            d += timedelta(days=1)

        if not cards_to_create:
            return Response({'detail': 'no se genero ninguna actividad con ese horario'}, status=400)

        created_cards = Card.objects.bulk_create(cards_to_create)
        CardEvent.objects.bulk_create(
            [CardEvent(card=c, action='created', detail='Creada por programación recurrente en Pending') for c in created_cards]
        )
        routine = Routine.objects.create(
            board=board, title=title, date_from=date_from, date_to=date_to, days=days, count=len(cards_to_create)
        )
        return Response(RoutineSerializer(routine).data, status=201)


class LogEntryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LogEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LogEntry.objects.filter(owner=self.request.user)
