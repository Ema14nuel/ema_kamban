from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('accounts', '0002_user_avatar')]
    operations = [migrations.AddField(
        model_name='user', name='auth_version',
        field=models.PositiveIntegerField(default=0, editable=False),
    )]
