from django.contrib import admin

from .models import Board, Card, CardEvent, LogEntry, Routine

admin.site.register(Board)
admin.site.register(Card)
admin.site.register(CardEvent)
admin.site.register(Routine)
admin.site.register(LogEntry)
