from django.utils.text import slugify

MAX_TAGS = 8


def parse_tags(keywords):
    """'Django, docker,  Nginx' -> [('Django', 'django'), ('docker', 'docker'), ('Nginx', 'nginx')]"""
    seen, result = set(), []
    for raw in (keywords or "").split(","):
        name = " ".join(raw.split())[:60]
        slug = slugify(name)[:80]
        if slug and slug not in seen:
            seen.add(slug)
            result.append((name, slug))
    return result[:MAX_TAGS]


def sync_post_tags(post, tag_model=None):
    """Hace que las etiquetas del post coincidan con sus palabras clave."""
    if tag_model is None:
        from .models import Tag as tag_model  # noqa: N813
    tags = [tag_model.objects.get_or_create(slug=slug, defaults={"name": name})[0] for name, slug in parse_tags(post.keywords)]
    post.tags.set(tags)
