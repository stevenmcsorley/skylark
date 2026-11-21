from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0015_alter_project_name_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="group",
            name="regressed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
