from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Preferencias', {'fields': ('sprite', 'notify_on_pomodoro')}),
    )


admin.site.register(User, CustomUserAdmin)
