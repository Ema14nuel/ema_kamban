from django.db import migrations, models


def set_initial_order(apps, schema_editor):
    Card = apps.get_model('boards', 'Card')
    for board_id, status in Card.objects.values_list('board_id', 'status').distinct():
        for order, card in enumerate(Card.objects.filter(board_id=board_id, status=status).order_by('created_at')):
            card.order = order
            card.save(update_fields=['order'])


class Migration(migrations.Migration):
    dependencies = [('boards', '0004_card_routine_routine_description')]

    operations = [
        migrations.AddField(model_name='card', name='order', field=models.PositiveIntegerField(default=0)),
        migrations.RunPython(set_initial_order, migrations.RunPython.noop),
    ]
