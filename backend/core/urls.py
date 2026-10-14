from django.contrib import admin
from django.urls import path, re_path, include
from django.conf.urls.static import static
from django.conf import settings

from apps.authentication.social import SocialAuthView

urlpatterns = [
    path('api/authentication/', include("apps.authentication.urls")),
    path('api/profile/', include("apps.user_profile.urls")),
    path('api/blog/', include('apps.blog.urls')),
    path('api/media/', include('apps.media.urls')),
    path('api/newsletter/', include('apps.newsletter.urls')),
    
    path("auth/", include("djoser.urls")),
    path("auth/", include("djoser.urls.jwt")),
    # Login con Google y GitHub (djoser social, con soporte de 2FA)
    re_path(r"^auth/o/(?P<provider>\S+)/$", SocialAuthView.as_view(), name="provider-auth"),
    path('admin/', admin.site.urls),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
