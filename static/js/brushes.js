const SketchForgeBrushes = {
    currentBrush: 'round',

    init() {
        this.setupBrushControls();
    },

    setupBrushControls() {
        const colorInput = document.getElementById('brushColor');
        const sizeInput = document.getElementById('brushSize');
        const sizeLabel = document.getElementById('brushSizeLabel');
        const opacityInput = document.getElementById('brushOpacity');
        const opacityLabel = document.getElementById('brushOpacityLabel');
        const flowInput = document.getElementById('brushFlow');
        const flowLabel = document.getElementById('brushFlowLabel');

        if (colorInput) {
            colorInput.addEventListener('change', (e) => {
                const fg = document.getElementById('colorFg');
                if (fg) fg.style.borderColor = e.target.value;
            });
        }

        if (sizeInput && sizeLabel) {
            sizeInput.addEventListener('input', (e) => {
                sizeLabel.textContent = e.target.value;
            });
        }

        if (opacityInput && opacityLabel) {
            opacityInput.addEventListener('input', (e) => {
                opacityLabel.textContent = e.target.value + '%';
            });
        }

        if (flowInput && flowLabel) {
            flowInput.addEventListener('input', (e) => {
                flowLabel.textContent = e.target.value + '%';
            });
        }

        const layerOpacity = document.getElementById('layerOpacity');
        const layerOpacityLabel = document.getElementById('layerOpacityLabel');
        if (layerOpacity && layerOpacityLabel) {
            layerOpacity.addEventListener('input', (e) => {
                layerOpacityLabel.textContent = e.target.value + '%';
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    SketchForgeBrushes.init();
});
