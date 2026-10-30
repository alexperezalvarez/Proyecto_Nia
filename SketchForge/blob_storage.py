import mimetypes
import os
from io import BytesIO

from django.conf import settings
from django.core.files import File
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible


def _store_id():
    store_id = os.getenv('BLOB_STORE_ID', '').strip()
    if store_id:
        return store_id[6:] if store_id.startswith('store_') else store_id

    token = (
        os.getenv('BLOB_READ_WRITE_TOKEN', '')
        or os.getenv('VERCEL_BLOB_READ_WRITE_TOKEN', '')
    ).strip()
    prefix = 'vercel_blob_rw_'
    if token.startswith(prefix):
        return token[len(prefix):].partition('_')[0]
    return ''


@deconstructible
class VercelBlobStorage(Storage):
    def __init__(self, access=None):
        self.access = access or os.getenv('BLOB_ACCESS', 'public')

    def _blob(self):
        from vercel.blob import sync as blob
        return blob

    def _save(self, name, content):
        if hasattr(content, 'seek'):
            content.seek(0)
        data = content.read()
        content_type = getattr(content, 'content_type', None)
        if not content_type:
            content_type = mimetypes.guess_type(name)[0]

        result = self._blob().put_blob(
            name,
            data,
            access=self.access,
            content_type=content_type,
            add_random_suffix=True,
            allow_overwrite=False,
        )
        return result.pathname

    def get_available_name(self, name, max_length=None):
        return name

    def delete(self, name):
        if not name:
            return
        try:
            self._blob().delete_blob(name)
        except Exception:
            pass

    def exists(self, name):
        try:
            self._blob().head_blob(name)
            return True
        except Exception:
            return False

    def _open(self, name, mode='rb'):
        result = self._blob().get_blob(name, access=self.access)
        return File(BytesIO(result.body), name=name)

    def size(self, name):
        return self._blob().head_blob(name).size

    def url(self, name):
        if name.startswith(('http://', 'https://')):
            return name

        store_id = _store_id()
        if store_id:
            return f"https://{store_id}.{self.access}.blob.vercel-storage.com/{name.lstrip('/')}"

        media_url = settings.MEDIA_URL
        if not media_url.startswith(('/', 'http://', 'https://')):
            media_url = '/' + media_url
        return f"{media_url.rstrip('/')}/{name.lstrip('/')}"
