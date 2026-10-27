from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [('boards', '0005_card_order')]
    operations = [migrations.AlterModelOptions(
        name='card', options={'ordering': ['order', 'created_at']},
    )]
