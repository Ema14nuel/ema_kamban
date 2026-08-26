from rest_framework import serializers

from .models import Board, Card, CardEvent, LogEntry, Routine


class CardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = ['id', 'board', 'status', 'title', 'desc', 'date', 'time', 'pomos', 'done_at', 'created_at']
        read_only_fields = ['id', 'pomos', 'done_at', 'created_at']


class BoardSerializer(serializers.ModelSerializer):
    cards = CardSerializer(many=True, read_only=True)

    class Meta:
        model = Board
        fields = ['id', 'name', 'color', 'bg_type', 'bg_value', 'music_url', 'music_name', 'cards']


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
