from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage
from storages.utils import clean_name


class StaticStorage(S3Boto3Storage):
    location = "static"
    custom_domain = getattr(settings, "AWS_S3_CUSTOM_DOMAIN", None)


class PublicMediaStorage(S3Boto3Storage):
    location = 'media'  # Define la carpeta principal para los archivos de medios
    # MinIO no maneja ACLs por objeto: el acceso se da con URLs firmadas
    default_acl = None if settings.USE_MINIO else 'public-read'  # Permitir acceso público a los archivos
    file_overwrite = False  # Evitar sobrescribir archivos con el mismo nombre

    def url(self, name, parameters=None, expire=None, http_method=None):
        if not settings.USE_MINIO:
            return super().url(name, parameters, expire, http_method)

        # Con MinIO la URL se firma contra el endpoint público, para que el navegador pueda resolverla
        from utils.s3_utils import generate_media_url

        return generate_media_url(self._normalize_name(clean_name(name)), expires_in=expire)
