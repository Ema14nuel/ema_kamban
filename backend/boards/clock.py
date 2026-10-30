from zoneinfo import ZoneInfo

from django.utils import timezone

BUSINESS_ZONE = ZoneInfo('America/Bogota')


def business_today():
    return timezone.localtime(timezone.now(), BUSINESS_ZONE).date()


def business_date(instant):
    return timezone.localtime(instant, BUSINESS_ZONE).date()
