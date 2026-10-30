try:
    from vercel.headers import set_headers
except ImportError:
    set_headers = None


class VercelOidcHeadersMiddleware:
    """Expone las cabeceras de Vercel al SDK para autenticación OIDC de Blob."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if set_headers is not None:
            set_headers({key: value for key, value in request.headers.items()})
        try:
            return self.get_response(request)
        finally:
            if set_headers is not None:
                set_headers(None)
