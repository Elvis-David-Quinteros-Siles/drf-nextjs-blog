import logging

from django.conf import settings
from botocore.exceptions import ClientError
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding

logger = logging.getLogger(__name__)


def generate_presigned_url(s3_client, client_method, method_parameters, expires_in):
    """
    Generate a presigned Amazon S3 URL that can be used to perform an action.

    :param s3_client: A Boto3 Amazon S3 client.
    :param client_method: The name of the client method that the URL performs.
    :param method_parameters: The parameters of the specified client method.
    :param expires_in: The number of seconds the presigned URL is valid for.
    :return: The presigned URL.
    """
    try:
        url = s3_client.generate_presigned_url(
            ClientMethod=client_method,
            Params=method_parameters,
            ExpiresIn=expires_in
        )
        logger.info("Got presigned URL: %s", url)
    except ClientError:
        logger.exception("Couldn't get a presigned URL for client method '%s'.", client_method)
        raise
    return url


def rsa_signer(message):
    # Load the private key from the string in Django settings
    private_key = serialization.load_pem_private_key(
        settings.AWS_CLOUDFRONT_KEY,  # Directly use the key from settings
        password=None,  # No password is assumed; adjust if your key is password-protected
        backend=default_backend()
    )
    # Sign the message
    signature = private_key.sign(
        message,
        padding.PKCS1v15(),
        hashes.SHA1()
    )
    # Return the base64-encoded signature
    return signature

def get_public_s3_client():
    """
    Boto3 client that signs URLs against the public MinIO endpoint (the one the browser can reach).
    Signing happens offline, so the endpoint does not need to be reachable from inside the container.
    """
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_PUBLIC_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def generate_media_url(key, expires_in=None):
    """
    Return a temporary URL to read an object from the bucket.
    Uses MinIO presigned URLs when AWS_S3_ENDPOINT_URL is set, CloudFront signed URLs otherwise.
    """
    if not key:
        return None

    if settings.USE_MINIO:
        return generate_presigned_url(
            get_public_s3_client(),
            "get_object",
            {"Bucket": settings.AWS_STORAGE_BUCKET_NAME, "Key": key},
            expires_in or settings.AWS_QUERYSTRING_EXPIRE,
        )

    import datetime
    from botocore.signers import CloudFrontSigner
    from django.utils import timezone

    signer = CloudFrontSigner(str(settings.AWS_CLOUDFRONT_KEY_ID), rsa_signer)
    expire_date = timezone.now() + datetime.timedelta(seconds=expires_in or 60)
    obj_url = f"https://{settings.AWS_CLOUDFRONT_DOMAIN}/{key}"
    return signer.generate_presigned_url(obj_url, date_less_than=expire_date)
