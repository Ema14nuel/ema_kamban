from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    SPRITE_CHOICES = [
        ('chico', 'Chico'),
        ('chica', 'Chica'),
        ('perro', 'Perro'),
        ('gato', 'Gato'),
    ]

    email = models.EmailField(unique=True)
    sprite = models.CharField(max_length=10, choices=SPRITE_CHOICES, default='chico')
    notify_on_pomodoro = models.BooleanField(default=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email
