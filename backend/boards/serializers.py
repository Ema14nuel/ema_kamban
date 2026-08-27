from rest_framework import serializers

from .models import Board, Card, CardEvent, CardNote, Column, LogEntry, Routine

FIXED_STATUSES = {'pending', 'progress', 'waiting', 'done'}


class ColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = Column
        fields = ['id', 'board', 'key', 'title', 'color', 'order']
        read_only_fields = ['id', 'key', 'order']


class CardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = ['id', 'board', 'status', 'title', 'desc', 'date', 'time', 'pomos', 'done_at', 'created_at']
        read_only_fields = ['id', 'pomos', 'done_at', 'created_at']

    def validate(self, attrs):
        status = attrs.get('status')
        board = attrs.get('board') or getattr(self.instance, 'board', None)
        if status and board:
            valid = FIXED_STATUSES | set(board.columns.values_list('key', flat=True))
            if status not in valid:
                raise serializers.ValidationError({'status': 'Columna inválida para este tablero.'})
        return attrs


class CardNoteSerializer(serializers.ModelSerializer):
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


class RoutineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Routine
        fields = ['id', 'board', 'title', 'date_from', 'date_to', 'days', 'count', 'created_at']
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
