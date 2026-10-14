from social_django.strategy import DjangoStrategy


# Módulo aparte de social.py: social_django carga SOCIAL_AUTH_STRATEGY al importarse
# y social.py importa djoser.social, que a su vez importa social_django.
class AxesDjangoStrategy(DjangoStrategy):
    """
    social-auth llama a authenticate() sin el request, y AxesStandaloneBackend
    (primero en AUTHENTICATION_BACKENDS) lo exige para aplicar los bloqueos.
    """

    def authenticate(self, backend, *args, **kwargs):
        kwargs.setdefault("request", getattr(self.request, "_request", self.request))
        return super().authenticate(backend, *args, **kwargs)
