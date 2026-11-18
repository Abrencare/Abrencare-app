from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("consultations", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="consultationprofile",
            name="onboarded_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        # Existing rows created before this change look "already onboarded".
        # Clear the stamp when the linked UserService is still unfinished so
        # the mobile consultation setup screen can run.
        migrations.RunSQL(
            sql="""
                UPDATE consultations_consultationprofile AS cp
                SET onboarded_at = NULL
                FROM services_userservice AS us
                WHERE cp.user_service_id = us.id
                  AND us.onboarded = FALSE;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
