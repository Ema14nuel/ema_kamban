from django.conf import settings
from django.db import models


class Board(models.Model):
    BG_TYPES = [('gradient', 'Gradient'), ('color', 'Color'), ('image', 'Image')]

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='boards', on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    color = models.CharField(max_length=20)
    bg_type = models.CharField(max_length=10, choices=BG_TYPES, default='gradient')
    bg_value = models.TextField(blank=True, default='')
    music_url = models.URLField(blank=True, default='')
    music_name = models.CharField(max_length=120, blank=True, default='ninguna')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return self.name


class Card(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('progress', 'In Progress'),
        ('waiting', 'Waiting'),
        ('done', 'Completed'),
    ]

    board = models.ForeignKey(Board, related_name='cards', on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    title = models.CharField(max_length=200)
    desc = models.TextField(blank=True, default='')
    date = models.CharField(max_length=10, blank=True, default='')
    time = models.CharField(max_length=5, blank=True, default='')
    pomos = models.PositiveIntegerField(default=0)
    done_at = models.CharField(max_length=10, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return self.title


class CardEvent(models.Model):
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('edited', 'Edited'),
        ('moved', 'Moved'),
    ]

    card = models.ForeignKey(Card, related_name='events', on_delete=models.CASCADE)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    detail = models.CharField(max_length=300, blank=True, default='')
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-at']

    def __str__(self):
        return f'{self.card_id} {self.action}: {self.detail}'


class Routine(models.Model):
    board = models.ForeignKey(Board, related_name='routines', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    date_from = models.CharField(max_length=10)
    date_to = models.CharField(max_length=10)
    days = models.JSONField(default=dict)
    count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class LogEntry(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='log_entries', on_delete=models.CASCADE)
    card = models.ForeignKey(Card, related_name='log_entries', null=True, on_delete=models.SET_NULL)
    board = models.ForeignKey(Board, related_name='log_entries', null=True, on_delete=models.SET_NULL)
    title = models.CharField(max_length=200)
    board_name = models.CharField(max_length=120)
    color = models.CharField(max_length=20)
    minutes = models.PositiveIntegerField()
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-at']

    def __str__(self):
        return f'{self.title} ({self.minutes}m)'
