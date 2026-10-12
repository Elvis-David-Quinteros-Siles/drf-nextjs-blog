from rest_framework_api.views import StandardAPIView
from rest_framework.exceptions import NotFound, APIException, ValidationError
from rest_framework import permissions, status
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.core.cache import cache
from django.db.models import Count, Q, F, Prefetch, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
import redis
from pprint import pprint
from bs4 import BeautifulSoup


from core.permissions import HasValidAPIKey
from .models import (
    Post, 
    Heading, 
    PostAnalytics, 
    Category, 
    CategoryAnalytics, 
    PostView, 
    PostInteraction, 
    Comment,
    PostLike,
    PostShare,
    Tag,
    Series,
    CommentReport,
)
from .serializers import (
    CategorySerializer,
    PostListSerializer,
    PostSerializer,
    HeadingSerializer,
    CategoryListSerializer,
    CommentSerializer,
    CommentReportSerializer,
    SeriesBriefSerializer,
    SeriesSerializer,
)
from .tags import sync_post_tags
from utils.ip_utils import get_client_ip
from apps.authentication.models import UserAccount
from apps.media.models import Media
from utils.string_utils import sanitize_string, sanitize_html

import uuid
from django.utils.text import slugify



MODERATOR_ROLES = ("admin", "moderator")
AUTO_HIDE_REPORTS = 3  # reportes distintos sin resolver que ocultan un comentario automáticamente


def can_moderate(user, post):
    """Moderan los comentarios de un post: staff, roles admin/moderator y el autor del post."""
    if not user or not user.is_authenticated:
        return False
    return user.is_staff or getattr(user, "role", None) in MODERATOR_ROLES or post.user_id == user.id


def mask_hidden_comments(serialized, moderator):
    """
    Los comentarios ocultos siguen en la lista (para no romper los hilos), pero
    sin contenido ni autor salvo para quien modera.
    """
    result = []
    for item in serialized:
        item = dict(item)
        if not item.get("is_active", True) and not moderator:
            item.update({"content": "", "author": None, "user": ""})
        result.append(item)
    return result


def invalidate_post_caches(slug=None):
    """Listados de posts y, si se indica, el detalle de un post."""
    for key in cache.keys("post_list:*"):
        cache.delete(key)
    if slug:
        cache.delete(f"post_detail:{slug}")


def assign_series(post, user, series_slug, series_order):
    """Asigna la serie indicada si pertenece al autor; vacío la quita."""
    if series_slug is None:
        return
    if series_slug == "":
        post.series = None
        post.series_order = 0
        return
    series = Series.objects.filter(slug=series_slug, user=user).first()
    if series:
        post.series = series
        try:
            post.series_order = max(0, int(series_order or 0))
        except (TypeError, ValueError):
            post.series_order = 0


def invalidate_comment_caches(comment):
    """
    Invalida la caché de comentarios afectada por crear, editar o borrar `comment`:
    la lista principal del post y las listas de respuestas de todos sus ancestros
    (sus contadores de respuestas cambian) y la del propio comentario.
    """
    def _clear(index_key):
        for key in cache.get(index_key, []):
            cache.delete(key)
        cache.delete(index_key)

    _clear(f"post_comments_cache_keys:{comment.post.slug}")
    node = comment
    while node is not None:
        _clear(f"comment_replies_cache_keys:{node.id}")
        node = node.parent

redis_client = redis.StrictRedis(host=settings.REDIS_HOST, port=6379, db=0)


class CategoriesListView(StandardAPIView):
    permission_classes = [HasValidAPIKey]

    def get(self,request):

        categories = Category.objects.all()

        serialized_categories = CategoryListSerializer(categories, many=True).data

        return self.response(serialized_categories)
    

class DetailCategoryView(StandardAPIView):
    permission_classes = [HasValidAPIKey]

    def get(self, request):
        """
        Obtener la informacion de una categoria
        """

        slug = request.query_params.get('slug', None)

        if not slug:
            raise ValueError("Slug parameter must be provided")

        try:
            category = Category.objects.get(slug=slug)
        except Category.DoesNotExist:
            raise NotFound(detail=f"No category found for {slug}")
        
        serialized_category = CategorySerializer(category).data

        return self.response(serialized_category)


class DetailPostView(StandardAPIView):
    permission_classes = [HasValidAPIKey]

    def get(self, request):
        """
        Obtener la informacion de un post
        """

        slug = request.query_params.get('slug', None)

        if not slug:
            raise ValueError("Slug parameter must be provided")

        try:
            post = Post.objects.get(slug=slug)
        except Post.DoesNotExist:
            raise NotFound(detail=f"No post found for {slug}")

        # Los borradores solo los ve su autor (antes cualquiera con la URL)
        if post.status != "published" and post.user != request.user:
            raise NotFound(detail=f"No post found for {slug}")
        
        serialized_post = PostSerializer(post, context={'request': request}).data

        return self.response(serialized_post)
    

class PostAuthorViews(StandardAPIView):
    permission_classes = [HasValidAPIKey, permissions.IsAuthenticated]

    def get(self, request):
        """
        Enlistar los posts de un autor
        """
        user = request.user
        if user.role == 'customer':
            return self.error("You do not have permission to create posts")
        
        posts = Post.objects.filter(user=user)

        if not posts.exists():
            raise NotFound(detail="No posts found.")
        
        serialized_posts = PostListSerializer(posts, many=True).data

        return self.paginate(request, serialized_posts)

    def post(self, request):
        """
        Crear un post para un autor
        """
        user = request.user
        if user.role == 'customer':
            return self.error("You do not have permission to create posts")

        # Validar campos obligatorios
        required_fields = ["title", "content", "slug", "category"]
        missing_fields = [
            field for field in required_fields if not request.data.get(field)
        ]
        if missing_fields:
            return self.error(f"Missing required fields: {', '.join(missing_fields)}")

        # Obtener parametros
        title = sanitize_string(request.data.get('title', None))
        description = sanitize_string(request.data.get('description', ""))
        content = sanitize_html(request.data.get('content', None))        
        post_status = request.data.get('status', 'draft')
        post_status = post_status if post_status in ('draft', 'published') else 'draft'        

        # Thumbnail params
        thumbnail_name = request.data.get("thumbnail_name", None)
        thumbnail_size = request.data.get("thumbnail_size", None)
        thumbnail_type = request.data.get("thumbnail_type", None)
        thumbnail_key = request.data.get("thumbnail_key", None)
        thumbnail_order = request.data.get("thumbnail_order", 0)
        thumbnail_media_type = request.data.get("thumbnail_media_type", 'image')

        # Other params
        keywords = sanitize_string(request.data.get("keywords", ""))
        slug = slugify(request.data.get("slug", None))
        category_slug = slugify(request.data.get("category", None))

        # Validar existencia de la categoría
        try:
            category = Category.objects.get(slug=category_slug)
        except Category.DoesNotExist:
            return self.error(
                f"Category '{category_slug}' does not exist.", status=400
            )
        
        try:
            post = Post.objects.create(
                user=user,
                title=title,
                description=description,
                content=content,
                keywords=keywords,
                slug=slug,
                category=category,
                status=post_status
            )

            if thumbnail_key:
                thumbnail = Media.objects.create(
                    order=thumbnail_order,
                    name=thumbnail_name,
                    size=thumbnail_size,
                    type=thumbnail_type,
                    key=thumbnail_key,
                    media_type=thumbnail_media_type
                )

                post.thumbnail = thumbnail
                post.save()

            # Procesar encabezados dinámicamente desde el contenido HTML
            soup = BeautifulSoup(content, "html.parser")
            headings = soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
            
            for order, heading in enumerate(headings, start=1):
                level = int(heading.name[1])  # Extract the level from 'h1', 'h2', etc.
                Heading.objects.create(
                    post=post,
                    title=heading.get_text(strip=True),
                    slug=slugify(heading.get_text(strip=True)),
                    level=level,
                    order=order,
                )

            # Etiquetas (desde las palabras clave) y serie
            sync_post_tags(post)
            assign_series(post, user, request.data.get("series"), request.data.get("series_order"))
            post.save()
            invalidate_post_caches(post.slug)

        except Exception as e:
            return self.error(f"An error occurred: {str(e)}")
        
        return self.response(
            f"Post '{post.title}' created successfully. It will be showed in a few minutes",
            status=status.HTTP_201_CREATED
        )

    def put(self, request):
        """
        Actualizar un post para un autor
        """
        user = request.user
        if user.role == 'customer':
            return self.error("You do not have permission to edit posts")
        
        post_slug = request.data.get("post_slug", None)
        title = sanitize_string(request.data.get('title', None))
        description = sanitize_string(request.data.get('description', ""))
        content = sanitize_html(request.data.get('content', None))        
        post_status = request.data.get('status', 'draft')
        post_status = post_status if post_status in ('draft', 'published') else 'draft'   
        keywords = sanitize_string(request.data.get('keywords', ""))
        slug = slugify(request.data.get("slug", None))
        category_slug = slugify(request.data.get("category", None))

        thumbnail_name = request.data.get("thumbnail_name", None)
        thumbnail_size = request.data.get("thumbnail_size", None)
        thumbnail_type = request.data.get("thumbnail_type", None)
        thumbnail_key = request.data.get("thumbnail_key", None)
        thumbnail_order = request.data.get("thumbnail_order", 0)
        thumbnail_media_type = request.data.get("thumbnail_media_type", 'image')

        try:
            post = Post.objects.get(slug=post_slug, user=user)
        except Post.DoesNotExist:
            raise NotFound(detail=f"Post {post_slug} does not exist")
        
        try:
            category = Category.objects.get(slug=category_slug)
        except Category.DoesNotExist:
            return self.error(
                f"Category '{category_slug}' does not exist.", status=400
            )
        
        # Verificar si el slug ya existe en otro post
        existing_post = Post.objects.filter(slug=slug).exclude(id=post.id).first()
        if existing_post:
            return self.error(f"The slug '{slug}' is already in use by another post")
        
        post.title=title
        post.description = description
        post.content = content
        post.status = post_status
        post.keywords = keywords
        post.slug = slug
        post.category=category

        if thumbnail_key:
            thumbnail = Media.objects.create(
                order=thumbnail_order,
                name=thumbnail_name,
                size=thumbnail_size,
                type=thumbnail_type,
                key=thumbnail_key,
                media_type=thumbnail_media_type
            )

            post.thumbnail = thumbnail

        # Procesar encabezados dinámicamente desde el contenido HTML
        soup = BeautifulSoup(content, "html.parser")
        headings = soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])

        # Borrar los headings actuales del post
        Heading.objects.filter(post=post).delete()
        
        for order, heading in enumerate(headings, start=1):
            level = int(heading.name[1])  # Extract the level from 'h1', 'h2', etc.
            Heading.objects.create(
                post=post,
                title=heading.get_text(strip=True),
                slug=slugify(heading.get_text(strip=True)),
                level=level,
                order=order,
            )

        assign_series(post, user, request.data.get("series"), request.data.get("series_order"))
        post.save()
        sync_post_tags(post)

        # Antes los cambios tardaban hasta 5 minutos en verse por la caché
        invalidate_post_caches(post_slug)
        invalidate_post_caches(post.slug)

        serialized_post = PostSerializer(post, context={'request': request}).data

        return self.response(serialized_post)

    def delete(self, request):
        """
        Borrar un post para un autor
        """

        user = request.user
        if user.role == 'customer':
            return self.error("You do not have permission to create posts")
        
        post_slug = request.query_params.get("slug", None)
        if not post_slug:
            raise NotFound(detail="Post slug must be provided.")
        
        try:
            post = Post.objects.get(slug=post_slug, user=user)
        except Post.DoesNotExist:
            raise NotFound(f"Post {post_slug} does not exist.")
        
        post.delete()

        invalidate_post_caches(post_slug)
        
        return self.response(f"Post with slug {post_slug} deleted successully.")

class PostListView(StandardAPIView):
    permission_classes = [HasValidAPIKey]

    def get(self, request, *args, **kwargs):
        try:
            # Parametros de solicitud
            search = request.query_params.get("search", "").strip()
            sorting = request.query_params.get("sorting", None)
            ordering = request.query_params.get("ordering", None)
            author = request.query_params.get("author", None)
            is_featured = request.query_params.get("is_featured", None)
            categories = request.query_params.getlist("categories", [])
            tag = request.query_params.get("tag", None)
            series = request.query_params.get("series", None)
            page = request.query_params.get("p", "1")

            # Construir clave de cache para resultados paginados
            cache_key = f"post_list:{search}:{sorting}:{ordering}:{author}:{categories}:{is_featured}:{tag}:{series}:{page}"
            cached_posts = cache.get(cache_key)
            if cached_posts:
                # Serializar los datos del caché
                serialized_posts = PostListSerializer(cached_posts, many=True).data
                # Incrementar impresiones en Redis para los posts del caché
                for post in cached_posts:
                    redis_client.incr(f"post:impressions:{post.id}")  # Usar `post.id`
                return self.paginate(request, serialized_posts)

            # Consulta inicial optimizada con nombres de anotación únicos
            posts = Post.postobjects.all().select_related("category").prefetch_related("tags").annotate(
                analytics_views=Coalesce(F("post_analytics__views"), Value(0)),
                analytics_likes=Coalesce(F("post_analytics__likes"), Value(0)),
                analytics_comments=Coalesce(F("post_analytics__comments"), Value(0)),
                analytics_shares=Coalesce(F("post_analytics__shares"), Value(0)),
            )
            
            # Filtrar por autor
            if author:
                posts = posts.filter(user__username=author)

            # Filtrar por etiqueta y por serie
            if tag:
                posts = posts.filter(tags__slug=tag)
            if series:
                posts = posts.filter(series__slug=series).order_by("series_order", "created_at")

            # Si no hay posts del autor, responder inmediatamente
            if not posts.exists():
                raise NotFound(detail=f"No posts found for author: {author}")
            
            # Filtrar por busqueda
            if search:
                posts = posts.filter(
                    Q(title__icontains=search) |
                    Q(description__icontains=search) |
                    Q(content__icontains=search) |
                    Q(keywords__icontains=search) |
                    Q(category__name__icontains=search)
                )
            
            # Filtrar por categoria
            if categories:
                category_queries = Q()
                for category in categories:
                    # Check if category is a valid uuid
                    try:
                        uuid.UUID(category)
                        uuid_query = (
                            Q(category__id=category)
                        )
                        category_queries |= uuid_query
                    except ValueError:
                        slug_query = (
                            Q(category__slug=category)
                        )
                        category_queries |= slug_query
                posts = posts.filter(category_queries)
            
            # Filtrar por posts destacados
            if is_featured:
                # Convertir el valor del parámetro a booleano
                is_featured = is_featured.lower() in ['true', '1', 'yes']
                posts = posts.filter(featured=is_featured)
            
            # Ordenamiento
            if sorting:
                if sorting == "newest":
                    posts = posts.order_by("-created_at")
                elif sorting == 'az':
                    posts = posts.order_by("title")
                elif sorting == 'za':
                    posts = posts.order_by("-title")
                elif sorting == "recently_updated":
                    posts = posts.order_by("-updated_at")
                elif sorting == "most_viewed":
                    posts = posts.order_by("-analytics_views") 

            # if ordering:

            # Guardar los objetos en el caché
            cache.set(cache_key, posts, timeout=60 * 5)

            # Serializar los datos para la respuesta
            serialized_posts = PostListSerializer(posts, many=True).data

            # Incrementar impresiones en Redis
            for post in posts:
                redis_client.incr(f"post:impressions:{post.id}")  # Usar `post.id`

            return self.paginate(request, serialized_posts)
        except NotFound as e:
            return self.response([], status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            raise APIException(detail=f"An unexpected error occurred: {str(e)}")


class PostDetailView(StandardAPIView):
    permission_classes = [HasValidAPIKey]

    def get(self, request):
        ip_address = get_client_ip(request)
        slug = request.query_params.get("slug")
        user = request.user if request.user.is_authenticated else None

        if not slug:
            raise NotFound(detail="A valid slug must be provided")

        try:
            # Verificar si los datos están en caché
            cache_key = f"post_detail:{slug}"
            cached_post = cache.get(cache_key)
            if cached_post and cached_post.status == "published":
                serialized_post = PostSerializer(cached_post, context={'request': request}).data
                self._register_view_interaction(cached_post, ip_address, user)
                return self.response(serialized_post)

            # Si no está en caché, obtener el post de la base de datos
            try:
                post = Post.objects.get(slug=slug)
            except Post.DoesNotExist:
                raise NotFound(f"Post {slug} does not exist.")

            # Un borrador solo lo puede previsualizar su autor; no se cachea ni cuenta vistas
            if post.status != "published":
                if user is None or post.user_id != user.id:
                    raise NotFound(f"Post {slug} does not exist.")
                return self.response(PostSerializer(post, context={'request': request}).data)

            serialized_post = PostSerializer(post, context={'request': request}).data

            # Guardar en el caché
            cache.set(cache_key, post, timeout=60 * 5)

            # Registrar interaccion
            self._register_view_interaction(post, ip_address, user)
            

        except (Post.DoesNotExist, NotFound):
            raise NotFound(detail="The requested post does not exist")
        except Exception as e:
            raise APIException(detail=f"An unexpected error occurred: {str(e)}")

        return self.response(serialized_post)

    def _register_view_interaction(self, post, ip_address, user):
        """
        Registra la interacción de tipo 'view', maneja incrementos de vistas únicas 
        y totales, y actualiza PostAnalytics.
        """
        # Verifica si esta IP y usuario ya registraron una vista única
        if not PostView.objects.filter(post=post, ip_address=ip_address, user=user).exists():
            # Crea un registro de vista unica
            PostView.objects.create(post=post, ip_address=ip_address, user=user)

            try:
                PostInteraction.objects.create(
                    user=user,
                    post=post,
                    interaction_type="view",
                    ip_address=ip_address,
                )
            except Exception as e:
                raise ValueError(f"Error creeating PostInteraction: {e}")

            analytics, _ = PostAnalytics.objects.get_or_create(post=post)
            analytics.increment_metric('views')
        

class PostHeadingsView(StandardAPIView):
    permission_classes = [HasValidAPIKey]

    def get(self,request):
        post_slug = request.query_params.get("slug")
        heading_objects = Heading.objects.filter(post__slug = post_slug)
        serialized_data = HeadingSerializer(heading_objects, many=True).data
        return self.response(serialized_data)
    

class IncrementPostClickView(StandardAPIView):
    permission_classes = [HasValidAPIKey]

    def post(self, request):
        """
        Incrementa el contador de clics de un post basado en su slug.
        """
        data = request.data

        try:
            post = Post.postobjects.get(slug=data['slug'])
        except Post.DoesNotExist:
            raise NotFound(detail="The requested post does not exist")
        
        try:
            post_analytics, created = PostAnalytics.objects.get_or_create(post=post)
            post_analytics.increment_click()
        except Exception as e:
            raise APIException(detail=f"An error ocurred while updating post analytics: {str(e)}")

        return self.response({
            "message": "Click incremented successfully",
            "clicks": post_analytics.clicks
        })


class CategoryListView(StandardAPIView):
    permission_classes = [HasValidAPIKey]

    def get(self, request):

        try:
            # Parametros de solicitud
            parent_slug = request.query_params.get("parent_slug", None)
            ordering = request.query_params.get("ordering", None)
            sorting = request.query_params.get("sorting", None)
            search = request.query_params.get("search", "").strip()
            page = request.query_params.get("p", "1")

            # Construir clave de cache para resultados paginados
            cache_key = f"category_list:{page}:{ordering}:{sorting}:{search}:{parent_slug}"
            cached_categories = cache.get(cache_key)
            if cached_categories:
                # Serializar los datos del caché
                serialized_categories = CategoryListSerializer(cached_categories, many=True).data
                # Incrementar impresiones en Redis para los posts del caché
                for category in cached_categories:
                    redis_client.incr(f"category:impressions:{category.id}")  # Usar `post.id`
                return self.paginate(request, serialized_categories)

            # Consulta inicial optimizada
            if parent_slug:
                categories = Category.objects.filter(parent__slug=parent_slug).prefetch_related(
                    Prefetch("category_analytics", to_attr="analytics_cache")
                )
            else:
                # Si no especificamos un parent_slug buscamos las categorias padre
                categories = Category.objects.filter(parent__isnull=True).prefetch_related(
                    Prefetch("category_analytics", to_attr="analytics_cache")
                )

            if not categories.exists():
                raise NotFound(detail="No categories found.")
            
            # Filtrar por busqueda
            if search != "":
                categories = categories.filter(
                    Q(name__icontains=search) |
                    Q(slug__icontains=search) |
                    Q(title__icontains=search) |
                    Q(description__icontains=search)
                )
            
            # Ordenamiento
            if sorting:
                if sorting == 'newest':
                    categories = categories.order_by("-created_at")
                elif sorting == 'recently_updated':
                    categories = categories.order_by("-updated_at")
                elif sorting == 'most_viewed':
                    categories = categories.annotate(popularity=F("analytics_cache__views")).order_by("-popularity")

            if ordering:
                if ordering == 'az':
                    posts = posts.order_by("name")
                if ordering == 'za':
                    posts = posts.order_by("-name")

            # Guardar los objetos en el caché
            cache.set(cache_key, categories, timeout=60 * 5)

            # Serializacion
            serialized_categories = CategoryListSerializer(categories, many=True).data

            # Incrementar impresiones en Redis
            for category in categories:
                redis_client.incr(f"category:impressions:{category.id}")

            return self.paginate(request, serialized_categories)
        except Exception as e:
                raise APIException(detail=f"An unexpected error occurred: {str(e)}")


class CategoryDetailView(StandardAPIView):
    permission_classes = [HasValidAPIKey]

    def get(self, request):

        try:
            # Obtener parametros
            slug = request.query_params.get("slug", None)
            page = request.query_params.get("p", "1")

            if not slug:
                return self.error("Missing slug parameter")
            
            # Construir cache
            cache_key = f"category_posts:{slug}:{page}"
            cached_posts = cache.get(cache_key)
            if cached_posts:
                # Serializar los datos del caché
                serialized_posts = PostListSerializer(cached_posts, many=True).data
                # Incrementar impresiones en Redis para los posts del caché
                for post in cached_posts:
                    redis_client.incr(f"post:impressions:{post.id}")  # Usar `post.id`
                return self.paginate(request, serialized_posts)

            # Obtener la categoria por slug
            category = get_object_or_404(Category, slug=slug)

            # Obtener los posts que pertenecen a esta categoria
            posts = Post.postobjects.filter(category=category).select_related("category").prefetch_related(
                Prefetch("post_analytics", to_attr="analytics_cache")
            )
            
            if not posts.exists():
                raise NotFound(detail=f"No posts found for category '{category.name}'")
            
            # Guardar los objetos en el caché
            cache.set(cache_key, posts, timeout=60 * 5)

            # Serializar los posts
            serialized_posts = PostListSerializer(posts, many=True).data

            # Incrementar impresiones en Redis
            for post in posts:
                redis_client.incr(f"post:impressions:{post.id}")

            return self.paginate(request, serialized_posts)
        except Exception as e:
            raise APIException(detail=f"An unexpected error occurred: {str(e)}")


class IncrementCategoryClickView(StandardAPIView):
    permission_classes = [HasValidAPIKey]

    def post(self, request):
        """
        Incrementa el contador de clics de una categoria basado en su slug.
        """
        data = request.data

        try:
            category = Category.objects.get(slug=data['slug'])
        except Category.DoesNotExist:
            raise NotFound(detail="The requested category does not exist")
        
        try:
            category_analytics, created = CategoryAnalytics.objects.get_or_create(category=category)
            category_analytics.increment_click()
        except Exception as e:
            raise APIException(detail=f"An error ocurred while updating category analytics: {str(e)}")

        return self.response({
            "message": "Click incremented successfully",
            "clicks": category_analytics.clicks
        })


class ListPostCommentsView(StandardAPIView):
    permission_classes = [HasValidAPIKey]

    def get(self, request):

        post_slug = request.query_params.get("slug", None)
        page = request.query_params.get("p", "1")

        if not post_slug:
            raise NotFound(detail="A valid post slug must be provided")

        # Definir clave cache
        cache_key = f"post_comments:{post_slug}:{page}"
        try:
            post = Post.objects.get(slug=post_slug)
        except Post.DoesNotExist:
            raise NotFound(detail=f"Post: {post_slug} does not exist")
        moderator = can_moderate(request.user, post)

        cached = cache.get(cache_key)
        if isinstance(cached, dict):
            return self.paginate_with_extra(
                request, mask_hidden_comments(cached["comments"], moderator), {"total": cached["total"], "can_moderate": moderator}
            )

        # Comentarios principales (los ocultos quedan como marcador); "total" cuenta los visibles con respuestas
        comments = Comment.objects.filter(post=post, parent=None).select_related("user")
        total = Comment.objects.filter(post=post, is_active=True).count()

        serialized_comments = CommentSerializer(comments, many=True).data

        # Guardar clave en el índice
        cache_index_key = f"post_comments_cache_keys:{post_slug}"
        cache_keys = cache.get(cache_index_key, [])
        cache_keys.append(cache_key)
        cache.set(cache_index_key, cache_keys, timeout=60 * 5)

        # Almacenar los datos en caché
        cache.set(cache_key, {"comments": serialized_comments, "total": total}, timeout=60 * 5)

        return self.paginate_with_extra(
            request, mask_hidden_comments(serialized_comments, moderator), {"total": total, "can_moderate": moderator}
        )


class PostCommentViews(StandardAPIView):
    permission_classes = [HasValidAPIKey, permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Crear un comentario para un post
        """
        # Obtener parametros
        post_slug = request.data.get("slug", None)
        user = request.user
        ip_address = get_client_ip(request)
        content = sanitize_html(request.data.get("content", None))

        if not post_slug:
            raise NotFound(detail="A valid post slug must be provided")

        if not BeautifulSoup(content, "html.parser").get_text(strip=True):
            raise ValidationError("El comentario está vacío.")
        
        try:
            post = Post.objects.get(slug=post_slug, status="published")
        except Post.DoesNotExist:
            raise NotFound(detail=f"Post: {post_slug} does not exist")
        
        # Crear comentario
        comment = Comment.objects.create(
            user=user,
            post=post,
            content=content,
        )

        invalidate_comment_caches(comment)

        # Actualizar interaccion de post
        self._register_comment_interaction(comment, post, ip_address, user)

        return self.response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)
    
    def put(self, request):
        """
        Modificar un comentario
        """
        # Obtener parametros
        comment_id = request.data.get("comment_id", None)
        content = sanitize_html(request.data.get("content", None))

        if not comment_id:
            raise NotFound(detail="A valid comment id must be provided")
        
        try:
            comment = Comment.objects.get(id=comment_id, user=request.user)
        except Comment.DoesNotExist:
            raise NotFound(detail=f"Comment with id: {comment_id} does not exist")
        
        comment.content = content
        comment.save()

        invalidate_comment_caches(comment)

        return self.response(CommentSerializer(comment).data)
    
    def delete(self, request):
        """
        Borrar un comentario
        """
        comment_id = request.query_params.get("comment_id", None)

        if not comment_id:
            raise NotFound(detail="A valid comment id must be provided")
        
        try:
            comment = Comment.objects.select_related("post").get(id=comment_id)
        except Comment.DoesNotExist:
            raise NotFound(detail=f"Comment with id: {comment_id} does not exist")

        # Puede borrarlo su autor o quien modera el post
        if comment.user_id != request.user.id and not can_moderate(request.user, comment.post):
            raise NotFound(detail=f"Comment with id: {comment_id} does not exist")
        
        post = comment.post
        post_analytics, _ = PostAnalytics.objects.get_or_create(post=post)

        invalidate_comment_caches(comment)

        # Borra también sus respuestas (on_delete=CASCADE)
        comment.delete()

        # Actualizar metricas
        comments_count = Comment.objects.filter(post=post, is_active=True).count()

        post_analytics.comments = comments_count
        post_analytics.save()

        return self.response("Comment deleted successfully")
    
    def _register_comment_interaction(self, comment, post, ip_address, user):

        PostInteraction.objects.create(
            user=user,
            post=post,
            interaction_type="comment",
            comment=comment,
            ip_address=ip_address
        )

        analytics, _ = PostAnalytics.objects.get_or_create(post=post)
        analytics.increment_metric("comments")


class ListCommentRepliesView(StandardAPIView):
    permission_classes = [HasValidAPIKey]

    def get(self, request):

        comment_id = request.query_params.get("comment_id")
        page = request.query_params.get("p", "1")

        if not comment_id:
            raise NotFound(detail="A valid comment_id must be provided")
        
        # Definir la clave cache
        cache_key = f"comment_replies:{comment_id}:{page}"

        # Obtener el comentario padre
        try:
            parent_comment = Comment.objects.select_related("post").get(id=comment_id)
        except Comment.DoesNotExist:
            raise NotFound(detail=f"Comment with id: {comment_id} does not exist")
        moderator = can_moderate(request.user, parent_comment.post)

        cached_replies = cache.get(cache_key)
        if cached_replies:
            return self.paginate(request, mask_hidden_comments(cached_replies, moderator))

        # Respuestas en orden cronológico (las ocultas quedan como marcador)
        replies = parent_comment.replies.select_related("user").order_by("created_at")

        # Serializar respuesta
        serialized_replies = CommentSerializer(replies, many=True).data

        # Registrar la clave en el índice de caché
        self._register_comment_reply_cache_key(comment_id, cache_key)

        # Guardar las respuestas en el caché
        cache.set(cache_key, serialized_replies, timeout=60 * 5)

        return self.paginate(request, mask_hidden_comments(serialized_replies, moderator))
    
    def _register_comment_reply_cache_key(self, comment_id, cache_key):
        """
        Registrar claves de caché relacionadas con las respuestas de un comentario.
        """
        cache_index_key = f"comment_replies_cache_keys:{comment_id}"
        cache_keys = cache.get(cache_index_key, [])
        if cache_key not in cache_keys:
            cache_keys.append(cache_key)
        cache.set(cache_index_key, cache_keys, timeout=60 * 5)

    
class CommentReplyViews(StandardAPIView):
    permission_classes = [HasValidAPIKey, permissions.IsAuthenticated]

    def post(self, request):

        # Obtener parametros
        comment_id = request.data.get("comment_id")
        user = request.user
        ip_address = get_client_ip(request)
        content = sanitize_html(request.data.get("content", None))

        if not comment_id:
            raise NotFound(detail="A valid comment_id must be provided")

        if not BeautifulSoup(content, "html.parser").get_text(strip=True):
            raise ValidationError("La respuesta está vacía.")

        # Obtener el comentario padre
        try:
            parent_comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            raise NotFound(detail=f"Comment with id: {comment_id} does not exist")
        
        # Crear el reply
        comment = Comment.objects.create(
            user=user,
            post=parent_comment.post,
            parent=parent_comment,
            content=content,
        )

        invalidate_comment_caches(comment)

        # Actualizar métricas
        self._register_comment_interaction(comment, comment.post, ip_address, user)

        return self.response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)

    def _register_comment_interaction(self, comment, post, ip_address, user):

        PostInteraction.objects.create(
            user=user,
            post=post,
            interaction_type="comment",
            comment=comment,
            ip_address=ip_address
        )

        analytics, _ = PostAnalytics.objects.get_or_create(post=post)
        analytics.increment_metric("comments")

class CommentModerationView(StandardAPIView):
    permission_classes = [HasValidAPIKey, permissions.IsAuthenticated]

    def post(self, request):
        """Ocultar o volver a mostrar un comentario (action: hide | show)."""
        comment_id = request.data.get("comment_id")
        action = request.data.get("action")
        if action not in ("hide", "show"):
            raise ValidationError("action debe ser 'hide' o 'show'.")

        comment = Comment.objects.select_related("post").filter(id=comment_id).first()
        if not comment or not can_moderate(request.user, comment.post):
            raise NotFound(detail="Comment not found")

        # update() en lugar de save(): moderar no debe marcar el comentario como "editado"
        comment.is_active = action == "show"
        Comment.objects.filter(pk=comment.pk).update(is_active=comment.is_active)
        # Al decidir sobre el comentario, sus reportes quedan resueltos
        comment.reports.filter(resolved=False).update(resolved=True)
        invalidate_comment_caches(comment)
        return self.response(CommentSerializer(comment).data)


class CommentReportView(StandardAPIView):
    permission_classes = [HasValidAPIKey, permissions.IsAuthenticated]

    def post(self, request):
        """Reportar un comentario. A los 3 reportes distintos sin resolver se oculta solo."""
        comment = Comment.objects.select_related("post").filter(id=request.data.get("comment_id")).first()
        if not comment:
            raise NotFound(detail="Comment not found")
        if comment.user_id == request.user.id:
            raise ValidationError("No puedes reportar tu propio comentario.")

        reason = request.data.get("reason", "other")
        if reason not in dict(CommentReport.REASONS):
            reason = "other"
        _, created = CommentReport.objects.get_or_create(
            comment=comment,
            user=request.user,
            defaults={"reason": reason, "details": sanitize_string(request.data.get("details", ""))[:300]},
        )
        if not created:
            return self.response("Ya habías reportado este comentario.")

        if comment.is_active and comment.reports.filter(resolved=False).count() >= AUTO_HIDE_REPORTS:
            comment.is_active = False
            Comment.objects.filter(pk=comment.pk).update(is_active=False)
            invalidate_comment_caches(comment)

        return self.response("Gracias, revisaremos el comentario.", status=status.HTTP_201_CREATED)


class CommentReportsListView(StandardAPIView):
    permission_classes = [HasValidAPIKey, permissions.IsAuthenticated]

    def get(self, request):
        """Comentarios con reportes pendientes que el usuario puede moderar."""
        user = request.user
        comments = Comment.objects.filter(reports__resolved=False).select_related("post", "user").distinct()
        if not (user.is_staff or user.role in MODERATOR_ROLES):
            comments = comments.filter(post__user=user)

        data = []
        for comment in comments.order_by("-created_at"):
            reports = comment.reports.filter(resolved=False)
            item = CommentSerializer(comment).data
            item["post_slug"] = comment.post.slug
            item["reports"] = CommentReportSerializer(reports, many=True).data
            data.append(item)
        return self.paginate(request, data)


class CommentReportsDismissView(StandardAPIView):
    permission_classes = [HasValidAPIKey, permissions.IsAuthenticated]

    def post(self, request):
        """Descartar los reportes de un comentario (se considera correcto)."""
        comment = Comment.objects.select_related("post").filter(id=request.data.get("comment_id")).first()
        if not comment or not can_moderate(request.user, comment.post):
            raise NotFound(detail="Comment not found")
        comment.reports.filter(resolved=False).update(resolved=True)
        return self.response("Reportes descartados.")


class TagListView(StandardAPIView):
    permission_classes = [HasValidAPIKey]

    def get(self, request):
        """Etiquetas con al menos un post publicado, de más a menos usadas."""
        tags = (
            Tag.objects.filter(posts__status="published")
            .annotate(posts_count=Count("posts", filter=Q(posts__status="published")))
            .order_by("-posts_count", "name")
            .distinct()
        )
        return self.response([{"name": t.name, "slug": t.slug, "posts_count": t.posts_count} for t in tags])


class SeriesView(StandardAPIView):
    permission_classes = [HasValidAPIKey]

    def get(self, request):
        """Detalle de una serie (?slug=) o listado de series con artículos publicados."""
        slug = request.query_params.get("slug")
        if slug:
            series = Series.objects.filter(slug=slug).select_related("user").first()
            if not series or not series.posts.filter(status="published").exists():
                raise NotFound(detail="Series not found")
            return self.response(SeriesSerializer(series).data)
        series = Series.objects.filter(posts__status="published").distinct()
        return self.response(SeriesBriefSerializer(series, many=True).data)


class MySeriesView(StandardAPIView):
    permission_classes = [HasValidAPIKey, permissions.IsAuthenticated]

    def get(self, request):
        """Series del autor, para elegirlas en el editor."""
        return self.response(SeriesBriefSerializer(Series.objects.filter(user=request.user), many=True).data)

    def post(self, request):
        """Crear una serie nueva."""
        if request.user.role == "customer":
            return self.error("You do not have permission to create series")
        title = sanitize_string(request.data.get("title", ""))[:128]
        if not title:
            raise ValidationError("La serie necesita un título.")
        base = slugify(title)[:120] or "serie"
        slug, n = base, 2
        while Series.objects.filter(slug=slug).exists():
            slug, n = f"{base}-{n}", n + 1
        series = Series.objects.create(
            user=request.user,
            title=title,
            slug=slug,
            description=sanitize_string(request.data.get("description", ""))[:300],
        )
        return self.response(SeriesBriefSerializer(series).data, status=status.HTTP_201_CREATED)


class PostLikeViews(StandardAPIView):
    permission_classes = [HasValidAPIKey, permissions.IsAuthenticated]

    def post(self, request):
        """
        Crear un 'like' para un post.
        """
        post_slug = request.data.get("slug", None)
        user = request.user

        ip_address = get_client_ip(request)

        if not post_slug:
            raise NotFound(detail="A valid post slug must be provided")
        
        try:
            post = Post.objects.get(slug=post_slug)
        except Post.DoesNotExist:
            raise NotFound(detail=f"Post: {post_slug} does not exist")
        
        # Verificar si el usuario ya ha dado like al post
        if PostLike.objects.filter(post=post, user=user).exists():
            raise ValidationError(detail="You have already liked this post.")
        
        # Crear 'like'
        PostLike.objects.create(post=post, user=user)

        # Registrar interacción
        PostInteraction.objects.create(
            user=user,
            post=post,
            interaction_type="like",
            ip_address=ip_address
        )

        # Incrementar métricas
        analytics, _ = PostAnalytics.objects.get_or_create(post=post)
        analytics.increment_metric("likes")

        return self.response(f"You have liked the post: {post.title}")
    
    def delete(self, request):
        """
        Eliminar un 'like' de un post.
        """
        post_slug = request.query_params.get("slug", None)
        user = request.user

        if not post_slug:
            raise NotFound(detail="A valid post slug must be provided")

        try:
            post = Post.objects.get(slug=post_slug)
        except Post.DoesNotExist:
            raise NotFound(detail=f"Post with slug: {post_slug} does not exist")
        
        # Verificar si el usuario ha dado like al post
        try:
            like = PostLike.objects.get(post=post, user=user)
        except PostLike.DoesNotExist:
            raise ValidationError(detail="You have not liked this post.")
        
        # Eliminar 'like'
        like.delete()

        # Actualizar métricas
        analytics, _ = PostAnalytics.objects.get_or_create(post=post)
        analytics.likes = PostLike.objects.filter(post=post).count()
        analytics.save()

        return self.response(f"You have unliked the post: {post.title}")


class PostShareView(StandardAPIView):
    permission_classes = [HasValidAPIKey]

    def post(self, request):
        """
        Maneja la acción de compartir un post.
        """
        # Obtener parámetros
        post_slug = request.data.get("slug", None)
        platform = request.data.get("platform", "other").lower()
        user = request.user if request.user.is_authenticated else None
        ip_address = get_client_ip(request)

        if not post_slug:
            raise NotFound(detail="A valid post slug must be provided")
        
        try:
            post = Post.objects.get(slug=post_slug)
        except Post.DoesNotExist:
            raise NotFound(detail=f"Post: {post_slug} does not exist")

        # Verificar que la plataforma es válida
        valid_platforms = [choice[0] for choice in PostShare._meta.get_field("platform").choices]
        if platform not in valid_platforms:
            raise ValidationError(detail=f"Invalid platform. Valid options are: {', '.join(valid_platforms)}")
        
        # Crear un registro de 'share'
        PostShare.objects.create(
            post=post,
            user=user,
            platform=platform
        )

        # Registrar interacción
        PostInteraction.objects.create(
            user=user,
            post=post,
            interaction_type="share",
            ip_address=ip_address
        )

        # Actualizar métricas
        analytics, _ = PostAnalytics.objects.get_or_create(post=post)
        analytics.increment_metric("shares")

        return self.response(f"Post '{post.title}' shared successfully on {platform.capitalize()}")
