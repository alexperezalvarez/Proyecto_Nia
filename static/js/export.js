const SketchForgeExport = {
    init() {
        this.setupExportButtons();
        document.getElementById('saveThumbBtn').addEventListener('click', () => this.saveThumbnail());
    },

    setupExportButtons() {
        document.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                this.export(format);
            });
        });
    },

    export(format) {
        const link = document.createElement('a');
        const canvas = SketchForge.canvas;
        const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
        const quality = format === 'jpeg' ? 0.95 : 1.0;

        link.download = `sketchforge-${Date.now()}.${format === 'jpeg' ? 'jpg' : format}`;
        link.href = canvas.toDataURL(mimeType, quality);
        link.click();

        $.ajax({
            url: EXPORT_URL,
            method: 'POST',
            headers: { 'X-CSRFToken': CSRF_TOKEN },
            contentType: 'application/json',
            data: JSON.stringify({
                image: canvas.toDataURL(),
                format: format
            }),
            success: (resp) => {
                if (resp.status === 'ok') {
                    SketchForge.showToast(`Exportado como ${format.toUpperCase()}`, 'success');
                }
            },
            error: () => {
                SketchForge.showToast('Error al exportar', 'error');
            }
        });
    },

    saveThumbnail() {
        const canvas = SketchForge.canvas;
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 300;
        thumbCanvas.height = 200;
        const ctx = thumbCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0, 300, 200);

        $.ajax({
            url: THUMBNAIL_URL,
            method: 'POST',
            headers: { 'X-CSRFToken': CSRF_TOKEN },
            contentType: 'application/json',
            data: JSON.stringify({ image: thumbCanvas.toDataURL() }),
            success: () => {
                SketchForge.showToast('Miniatura guardada', 'success');
            },
            error: () => {
                SketchForge.showToast('Error al guardar miniatura', 'error');
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    SketchForgeExport.init();
});
