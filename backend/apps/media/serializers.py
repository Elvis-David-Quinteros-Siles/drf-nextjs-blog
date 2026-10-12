from rest_framework import serializers

from utils.s3_utils import generate_media_url
from .models import Media


class MediaSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = Media
        fields = "__all__"

    def get_url(self, obj):
        if not obj.key:
            return None

        return generate_media_url(obj.key)
