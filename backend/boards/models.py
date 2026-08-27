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


class Column(models.Model):
    """Columna adicional definida por el usuario para un tablero puntual.

    Las 4 columnas fijas (pending/progress/waiting/done) siguen sin tener fila
    propia acá — solo existen como constantes compartidas con el frontend.
    Estas son las que un usuario agrega desde un tablero ("más columnas, con
    el nombre que quieran"); no se reflejan en el consolidado entre tableros,
    solo dentro del tablero al que pertenecen.
    """

    board = models.ForeignKey(Board, related_name='columns', on_delete=models.CASCADE)
    # "col-<id>" asignado después del primer save (ver perform_create) — nunca
    # puede chocar con una de las 4 claves fijas.
    key = models.CharField(max_length=20, blank=True, default='')
    title = models.CharField(max_length=60)
    color = models.CharField(max_length=20, default='#64748b')
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f'{self.board_id}:{self.title}'


class Card(models.Model):
    board = models.ForeignKey(Board, related_name='cards', on_delete=models.CASCADE)
    # Sin choices: puede ser una de las 4 claves fijas o la key de una Column
    # personalizada del mismo tablero — se valida en el serializer/vista.
    status = models.CharField(max_length=20, default='pending')
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


class CardNote(models.Model):
    """Nota suelta con fecha/hora, aparte de la descripción de la tarjeta.

    De solo agregar (no se edita ni se borra) — es un registro cronológico,
    como el resto de la traza de la actividad.
    """

    card = models.ForeignKey(Card, related_name='notes', on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.card_id}: {self.text[:30]}'


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
