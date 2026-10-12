from rest_framework import serializers

from apps.authentication.serializers import UserPublicSerializer

from .models import (
    Post, 
    Category, 
    Tag,
    Series,
    CommentReport,
    Heading, 
    PostView, 
    PostInteraction, 
    Comment, 
    PostLike, 
    PostShare,
    CategoryAnalytics,
    PostAnalytics
)
from apps.media.serializers import MediaSerializer
from apps.authentication.serializers import UserPublicSerializer

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["name", "slug"]


class SeriesSerializer(serializers.ModelSerializer):
    """Serie con la lista ordenada de sus artículos publicados (para navegar entre partes)."""
    posts = serializers.SerializerMethodField()
    author = UserPublicSerializer(source="user", read_only=True)

    class Meta:
        model = Series
        fields = ["id", "title", "slug", "description", "author", "posts"]

    def get_posts(self, obj):
        posts = obj.posts.filter(status="published").order_by("series_order", "created_at")
        return [{"title": p.title, "slug": p.slug, "order": p.series_order} for p in posts]


class SeriesBriefSerializer(serializers.ModelSerializer):
    posts_count = serializers.SerializerMethodField()

    class Meta:
        model = Series
        fields = ["id", "title", "slug", "description", "posts_count"]

    def get_posts_count(self, obj):
        return obj.posts.filter(status="published").count()


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


class CategoryListSerializer(serializers.ModelSerializer):
    thumbnail = MediaSerializer()
    class Meta:
        model = Category
        fields = [
            'name',
            'slug',
            'thumbnail'
        ]


class CategoryAnalyticsSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = CategoryAnalytics
        fields = [
            "id",
            "category_name",
            "views",
            "impressions",
            "clicks",
            "click_through_rate",
            "avg_time_on_page",
        ]

    def get_category_name(self, obj):
        return obj.category.name


class HeadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Heading
        fields = [
            "id",
            "title",
            "slug",
            "level",
            "order",
        ]


class PostViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostView
        fields = "__all__"


class PostSerializer(serializers.ModelSerializer):
    category = CategorySerializer()
    headings = HeadingSerializer(many=True)
    view_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    has_liked = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    thumbnail = MediaSerializer()
    user = serializers.StringRelatedField()
    tags = TagSerializer(many=True, read_only=True)
    series = SeriesSerializer(read_only=True)

    class Meta:
        model = Post
        fields = "__all__"
    
    def get_view_count(self, obj):
        return obj.post_analytics.views if obj.post_analytics else 0
    
    def get_comments_count(self, obj):
        return obj.post_comments.filter(parent=None, is_active=True).count()
    
    def get_likes_count(self, obj):
        return obj.likes.filter().count()
    
    def get_has_liked(self, obj):
        """
        Verifica si el usuario autenticado ha dado 'like' al post.
        """
        request = self.context.get('request')
        user = request.user if request else None
        if user and user.is_authenticated:
            return PostLike.objects.filter(post=obj, user=user).exists()
        return False


class PostListSerializer(serializers.ModelSerializer):
    category = CategoryListSerializer()
    view_count = serializers.SerializerMethodField()
    thumbnail = MediaSerializer()
    user = UserPublicSerializer()
    tags = TagSerializer(many=True, read_only=True)
    
    class Meta:
        model = Post
        fields = [
            "tags",
            "id",
            "title",
            "description",
            "thumbnail",
            "slug",
            "category",
            "view_count",
            "updated_at",
            "created_at",
            "user",
            "featured",
            "status"
        ]

    def get_view_count(self, obj):
        return obj.post_analytics.views if obj.post_analytics else 0


class PostAnalyticsSerializer(serializers.ModelSerializer):
    post_title = serializers.SerializerMethodField()

    class Meta:
        model = PostAnalytics
        fields = [
            "id",
            "post_title",
            "impressions",
            "clicks",
            "click_through_rate",
            "avg_time_on_page",
            "views",
            "likes",
            "comments",
            "shares",
        ]

    def get_post_title(self, obj):
        return obj.post.title


class PostInteractionSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField() # Devuelve el email del usuario
    post_title = serializers.SerializerMethodField()
    comment_content = serializers.SerializerMethodField()

    def get_post_title(self, obj):
        return obj.post.title
    
    def get_comment_content(self, obj):
        return obj.comment.content if obj.comment else None
    
    class Meta:
        model = PostInteraction
        fields = [
            "id",
            "user",
            "post",
            "post_title",
            "interaction_type",
            "interaction_category",
            "weight",
            "timestamp",
            "device_type",
            "ip_address",
            "hour_of_day",
            "day_of_week",
            "comment_content",
        ]


class CommentSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    # Nombre completo y foto para mostrar el autor del comentario
    author = UserPublicSerializer(source="user", read_only=True)
    post_title = serializers.SerializerMethodField()
    replies_count = serializers.SerializerMethodField()
    # replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "user",
            "author",
            "post",
            "post_title",
            "parent",
            "content",
            "created_at",
            "updated_at",
            "is_active",
            "replies_count",
            # "replies",
        ]

    def get_post_title(self, obj):
        return obj.post.title

    def get_replies(self, obj):
        replies = obj.replies.filter(is_active=True)
        return CommentSerializer(replies, many=True).data
    
    def get_replies_count(self, obj):
        # Incluye respuestas ocultas: se muestran como "comentario oculto" para no romper el hilo
        return obj.replies.count()


class PostLikeSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()

    class Meta:
        model = PostLike
        fields = [
            "id",
            "post",
            "user",
            "timestamp",
        ]


class PostShareSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()

    class Meta:
        model = PostShare
        fields = [
            "id",
            "post",
            "user",
            "platform",
            "timestamp",
        ]

class CommentReportSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()

    class Meta:
        model = CommentReport
        fields = ["id", "user", "reason", "details", "created_at"]
