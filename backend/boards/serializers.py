from datetime import date, time

from rest_framework import serializers

from .models import Board, Card, CardEvent, CardNote, Column, LogEntry, Routine

FIXED_STATUSES = {'pending', 'progress', 'waiting', 'done'}


class OwnedBoardSerializer(serializers.ModelSerializer):
    """Validate the destination, not only the object being updated."""

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            fields['board'].queryset = Board.objects.filter(owner=request.user)
        else:
            fields['board'].queryset = Board.objects.none()
        return fields

    def validate_board(self, board):
        request = self.context.get('request')
        if not request or board.owner_id != request.user.id:
            raise serializers.ValidationError('Tablero no disponible.')
        if self.instance and self.instance.board_id != board.pk:
            raise serializers.ValidationError('No se puede cambiar el tablero.')
        return board


def iso_date(value):
    try:
        if date.fromisoformat(value).isoformat() != value:
            raise ValueError
    except (TypeError, ValueError):
        raise serializers.ValidationError('Usa una fecha válida AAAA-MM-DD.')
    return value


def clock_time(value):
    try:
        if len(value) != 5 or time.fromisoformat(value).strftime('%H:%M') != value:
            raise ValueError
    except (TypeError, ValueError):
        raise serializers.ValidationError('Usa una hora válida HH:MM.')
    return value


class ColumnSerializer(OwnedBoardSerializer):
    class Meta:
        model = Column
        fields = ['id', 'board', 'key', 'title', 'color', 'order']
        read_only_fields = ['id', 'key', 'order']


class CardSerializer(OwnedBoardSerializer):
    status = serializers.CharField(max_length=20, default='pending')
    desc = serializers.CharField(max_length=20000, required=False, allow_blank=True)

    def validate_date(self, value):
        return iso_date(value) if value else value

    def validate_time(self, value):
        return clock_time(value) if value else value

    class Meta:
        model = Card
        fields = ['id', 'board', 'status', 'title', 'desc', 'date', 'time', 'pomos', 'order', 'done_at', 'created_at']
        read_only_fields = ['id', 'pomos', 'order', 'done_at', 'created_at']

    def validate(self, attrs):
        status = attrs.get('status')
        board = attrs.get('board') or getattr(self.instance, 'board', None)
        if status and board:
            valid = FIXED_STATUSES | set(board.columns.values_list('key', flat=True))
            if status not in valid:
                raise serializers.ValidationError({'status': 'Columna inválida para este tablero.'})
        return attrs


class CardNoteSerializer(serializers.ModelSerializer):
    text = serializers.CharField(max_length=10000, trim_whitespace=True)

    class Meta:
        model = CardNote
        fields = ['id', 'card', 'text', 'created_at']
        read_only_fields = ['id', 'card', 'created_at']


class BoardSerializer(serializers.ModelSerializer):
    cards = CardSerializer(many=True, read_only=True)
    columns = ColumnSerializer(many=True, read_only=True)

    class Meta:
        model = Board
        fields = ['id', 'name', 'color', 'bg_type', 'bg_value', 'music_url', 'music_name', 'cards', 'columns']


class RoutineSerializer(OwnedBoardSerializer):
    description = serializers.CharField(max_length=20000, required=False, allow_blank=True)

    def validate(self, attrs):
        start = iso_date(attrs.get('date_from', getattr(self.instance, 'date_from', '')))
        end = iso_date(attrs.get('date_to', getattr(self.instance, 'date_to', '')))
        span = (date.fromisoformat(end) - date.fromisoformat(start)).days
        if not 0 <= span <= 365:
            raise serializers.ValidationError('El rango debe tener como máximo 366 días.')
        days = attrs.get('days', getattr(self.instance, 'days', {}))
        keys = {'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'}
        if not isinstance(days, dict) or set(days) - keys:
            raise serializers.ValidationError({'days': 'Horario inválido.'})
        active = False
        for cfg in days.values():
            if not isinstance(cfg, dict) or type(cfg.get('on')) is not bool:
                raise serializers.ValidationError({'days': 'Cada día requiere on booleano.'})
            if not cfg['on']:
                continue
            active = True
            mode = cfg.get('mode')
            if mode == 'fixed':
                clock_time(cfg.get('time', ''))
            elif mode == 'range':
                first, last = clock_time(cfg.get('start', '')), clock_time(cfg.get('end', ''))
                if last <= first:
                    raise serializers.ValidationError({'days': 'El fin debe ser posterior al inicio.'})
            else:
                raise serializers.ValidationError({'days': 'Modo de horario inválido.'})
        if not active:
            raise serializers.ValidationError({'days': 'Activa al menos un día.'})
        return attrs

    class Meta:
        model = Routine
        fields = ['id', 'board', 'title', 'description', 'date_from', 'date_to', 'days', 'count', 'created_at']
        read_only_fields = ['id', 'count', 'created_at']


class LogEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LogEntry
        fields = ['id', 'card', 'board', 'title', 'board_name', 'color', 'minutes', 'at']
        read_only_fields = ['id', 'at']


class CardEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CardEvent
        fields = ['id', 'card', 'action', 'detail', 'at']
        read_only_fields = ['id', 'card', 'action', 'detail', 'at']


class PomodoroInputSerializer(serializers.Serializer):
    minutes = serializers.IntegerField(min_value=1, max_value=180, default=25)


class MoveInputSerializer(serializers.Serializer):
    status = serializers.CharField(max_length=20)
    position = serializers.IntegerField(min_value=0, max_value=1000000, required=False)


class TodayInputSerializer(serializers.Serializer):
    today = serializers.CharField(validators=[iso_date], required=False)
