import mimetypes
import os
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Sube los archivos existentes de media/ a Vercel Blob conservando sus rutas.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Solo muestra los archivos sin subirlos.')
        parser.add_argument('--overwrite', action='store_true', help='Sobrescribe blobs existentes.')

    def handle(self, *args, **options):
        if not (
            os.getenv('BLOB_READ_WRITE_TOKEN')
            or os.getenv('VERCEL_BLOB_READ_WRITE_TOKEN')
            or os.getenv('BLOB_STORE_ID')
        ):
            raise CommandError('Configura BLOB_READ_WRITE_TOKEN o BLOB_STORE_ID antes de migrar.')

        try:
            from vercel.blob import sync as blob
        except ImportError as exc:
            raise CommandError('Falta el paquete vercel-blob. Instala requirements.txt.') from exc

        media_root = Path(settings.MEDIA_ROOT)
        if not media_root.exists():
            raise CommandError(f'No existe la carpeta media: {media_root}')

        access = os.getenv('BLOB_ACCESS', 'public')
        files = sorted(p for p in media_root.rglob('*') if p.is_file())

        if not files:
            self.stdout.write('No hay archivos para migrar.')
            return

        uploaded = 0
        skipped = 0
        failed = 0

        for path in files:
            relative = path.relative_to(media_root).as_posix()

            if options['dry_run']:
                self.stdout.write(f'[dry-run] {relative}')
                continue

            try:
                if not options['overwrite'] and blob.head_blob(relative):
                    self.stdout.write(f'[omitido] {relative}')
                    skipped += 1
                    continue
            except Exception:
                pass

            try:
                content_type = mimetypes.guess_type(relative)[0] or 'application/octet-stream'
                blob.put_blob(
                    relative,
                    path.read_bytes(),
                    access=access,
                    content_type=content_type,
                    add_random_suffix=False,
                    allow_overwrite=True,
                )
                uploaded += 1
                self.stdout.write(f'[ok] {relative}')
            except Exception as exc:
                failed += 1
                self.stderr.write(f'[error] {relative}: {exc}')

        self.stdout.write(self.style.SUCCESS(
            f'Migración terminada: {uploaded} subidos, {skipped} omitidos, {failed} errores.'
        ))
