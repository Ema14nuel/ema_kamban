from django.contrib import admin

from .models import Board, Card, CardEvent, CardNote, Column, LogEntry, Routine

admin.site.register(Board)
admin.site.register(Column)
admin.site.register(Card)
admin.site.register(CardEvent)
admin.site.register(CardNote)
admin.site.register(Routine)
admin.site.register(LogEntry)
