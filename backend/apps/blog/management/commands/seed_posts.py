"""Carga las categorías y los posts iniciales del blog (idempotente).

Por defecto solo crea lo que falta (claves naturales: slug), así que no pisa
ediciones hechas desde la app. Con --refresh restaura el contenido versionado.
Cada post recibe una portada generada con Pillow y subida al bucket.

    python manage.py seed_posts --author elvis
"""
import io
import textwrap

import boto3
from bs4 import BeautifulSoup
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify
from PIL import Image, ImageDraw, ImageFont

from apps.authentication.models import UserAccount
from apps.blog.models import Category, Heading, Post
from apps.media.models import Media
from utils.string_utils import sanitize_html

from ._seed_posts_content import CATEGORIES, POSTS

COVER_SIZE = (1200, 630)
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

# Gradiente (inicio, fin) por categoría
PALETTES = {
    "backend": ((15, 23, 42), (30, 64, 175)),
    "devops": ((15, 23, 42), (13, 116, 110)),
    "seguridad": ((15, 23, 42), (126, 34, 206)),
}


def render_cover(title, category_name, palette):
    """PNG 1200x630 con gradiente diagonal, categoría y título."""
    width, height = COVER_SIZE
    start, end = palette
    img = Image.new("RGB", COVER_SIZE)
    draw = ImageDraw.Draw(img)
    for x in range(width):
        t = x / width
        color = tuple(int(start[i] + (end[i] - start[i]) * t) for i in range(3))
        draw.line([(x, 0), (x, height)], fill=color)

    draw.text((80, 80), category_name.upper(), font=ImageFont.truetype(FONT_MONO, 30), fill=(165, 243, 252))
    title_font = ImageFont.truetype(FONT_BOLD, 58)
    y = 170
    for line in textwrap.wrap(title, width=32)[:5]:
        draw.text((80, y), line, font=title_font, fill=(255, 255, 255))
        y += 74
    draw.text((80, height - 90), "blog.edqs.online", font=ImageFont.truetype(FONT_MONO, 28), fill=(203, 213, 225))

    buffer = io.BytesIO()
    img.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


class Command(BaseCommand):
    help = "Crea las categorías y posts iniciales del blog. --refresh restaura el contenido versionado."

    def add_arguments(self, parser):
        parser.add_argument("--author", required=True, help="username del autor de los posts")
        parser.add_argument("--refresh", action="store_true", help="Sobrescribe posts existentes con el contenido versionado")

    def handle(self, *args, **options):
        try:
            author = UserAccount.objects.get(username=options["author"])
        except UserAccount.DoesNotExist:
            raise CommandError(f"No existe el usuario '{options['author']}'")

        s3 = boto3.client(
            "s3",
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )

        categories = {}
        for data in CATEGORIES:
            category, created = Category.objects.get_or_create(
                slug=data["slug"],
                defaults={k: v for k, v in data.items() if k != "slug"},
            )
            categories[data["slug"]] = category
            self.stdout.write(f"{'+' if created else '='} categoría {category.slug}")

        for data in POSTS:
            post = Post.objects.filter(slug=data["slug"]).first()
            if post and not options["refresh"]:
                self.stdout.write(f"= post {post.slug}")
                continue
            post = self._save_post(data, post, author, categories[data["category"]], s3)
            self.stdout.write(self.style.SUCCESS(f"+ post {post.slug}"))

    @transaction.atomic
    def _save_post(self, data, post, author, category, s3):
        content = sanitize_html(data["content"].strip())
        fields = dict(
            user=author,
            title=data["title"],
            description=data["description"],
            content=content,
            keywords=data["keywords"],
            category=category,
            featured=data["featured"],
            status="published",
        )
        if post:
            for name, value in fields.items():
                setattr(post, name, value)
        else:
            post = Post(slug=data["slug"], **fields)

        # Portada: misma ruta que usa el frontend al subir thumbnails
        key = f"media/blog/posts/{author.username}/{data['slug']}/portada.png"
        png = render_cover(data["title"], category.name, PALETTES.get(category.slug, PALETTES["backend"]))
        s3.put_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=key, Body=png, ContentType="image/png")
        post.thumbnail = Media.objects.create(
            name="portada.png", size=str(len(png)), type="image/png", key=key, media_type="image"
        )
        post.save()

        # Encabezados para la tabla de contenidos, igual que al crear un post desde la API
        post.headings.all().delete()
        soup = BeautifulSoup(content, "html.parser")
        for order, heading in enumerate(soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]), start=1):
            text = heading.get_text(strip=True)
            Heading.objects.create(post=post, title=text, slug=slugify(text), level=int(heading.name[1]), order=order)
        return post
