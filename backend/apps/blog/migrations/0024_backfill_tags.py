from django.db import migrations


def backfill(apps, schema_editor):
    from apps.blog.tags import sync_post_tags

    Post = apps.get_model("blog", "Post")
    Tag = apps.get_model("blog", "Tag")
    for post in Post.objects.all():
        sync_post_tags(post, tag_model=Tag)


class Migration(migrations.Migration):

    dependencies = [
        ("blog", "0023_tags_series_comment_reports"),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
