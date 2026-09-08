const SketchForgeLayers = {
    layerCounter: 1,

    init() {
        this.setupLayerEvents();
        this.setupLayerActions();
    },

    setupLayerEvents() {
        document.getElementById('addLayerBtn').addEventListener('click', () => this.addLayer());
        document.getElementById('layersList').addEventListener('click', (e) => {
            const item = e.target.closest('.layer-item');
            if (!item) return;

            if (e.target.closest('.layer-visibility')) {
                this.toggleVisibility(item);
            } else if (e.target.closest('.layer-lock')) {
                this.toggleLock(item);
            } else {
                this.selectLayer(item);
            }
        });

        document.getElementById('layersList').addEventListener('dblclick', (e) => {
            const item = e.target.closest('.layer-item');
            if (!item) return;
            const nameEl = item.querySelector('.layer-name');
            if (nameEl) {
                this.startRename(item, nameEl);
            }
        });
    },

    setupLayerActions() {
        const dupBtn = document.getElementById('duplicateLayerBtn');
        if (dupBtn) dupBtn.addEventListener('click', () => this.duplicateLayer());

        const upBtn = document.getElementById('moveLayerUpBtn');
        if (upBtn) upBtn.addEventListener('click', () => this.moveLayer(-1));

        const downBtn = document.getElementById('moveLayerDownBtn');
        if (downBtn) downBtn.addEventListener('click', () => this.moveLayer(1));

        const delBtn = document.getElementById('deleteLayerBtn');
        if (delBtn) delBtn.addEventListener('click', () => this.deleteActiveLayer());
    },

    addLayer() {
        this.layerCounter++;
        const list = document.getElementById('layersList');

        document.querySelectorAll('.layer-item').forEach(l => l.classList.remove('active'));

        const div = document.createElement('div');
        div.className = 'layer-item active';
        div.dataset.layerOrder = list.children.length;
        div.innerHTML = `
            <div class="layer-thumb">
                <i class="bi bi-image"></i>
            </div>
            <div class="layer-info">
                <span class="layer-name">Capa ${this.layerCounter}</span>
                <span class="layer-meta">Opacidad: 100%</span>
            </div>
            <div class="layer-controls">
                <button class="layer-visibility active-toggle" title="Visibilidad">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="layer-lock" title="Bloquear">
                    <i class="bi bi-lock-open"></i>
                </button>
            </div>
        `;

        list.appendChild(div);
        SketchForge.saveState();
        SketchForge.showToast('Nueva capa creada', 'success');
    },

    selectLayer(item) {
        document.querySelectorAll('.layer-item').forEach(l => l.classList.remove('active'));
        item.classList.add('active');
        SketchForge.currentLayerIndex = Array.from(item.parentElement.children).indexOf(item);

        const name = item.querySelector('.layer-name')?.textContent || 'Capa';
        const statusLayer = document.getElementById('statusLayer');
        if (statusLayer) statusLayer.textContent = name;
    },

    toggleVisibility(item) {
        const btn = item.querySelector('.layer-visibility');
        const icon = btn.querySelector('i');
        btn.classList.toggle('active-toggle');
        icon.classList.toggle('bi-eye');
        icon.classList.toggle('bi-eye-slash');
    },

    toggleLock(item) {
        const btn = item.querySelector('.layer-lock');
        const icon = btn.querySelector('i');
        btn.classList.toggle('active-toggle');
        icon.classList.toggle('bi-lock');
        icon.classList.toggle('bi-lock-open');
    },

    startRename(item, nameEl) {
        const currentName = nameEl.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'layer-name-input';

        nameEl.replaceWith(input);
        input.focus();
        input.select();

        const finish = () => {
            const newName = input.value.trim() || currentName;
            const span = document.createElement('span');
            span.className = 'layer-name';
            span.textContent = newName;
            input.replaceWith(span);
        };

        input.addEventListener('blur', finish);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finish();
            if (e.key === 'Escape') {
                input.value = currentName;
                finish();
            }
        });
    },

    duplicateLayer() {
        const active = document.querySelector('.layer-item.active');
        if (!active) return;

        this.layerCounter++;
        const clone = active.cloneNode(true);
        clone.classList.add('active');
        const nameEl = clone.querySelector('.layer-name');
        if (nameEl) nameEl.textContent = nameEl.textContent + ' copia';

        active.classList.remove('active');
        active.after(clone);
        SketchForge.saveState();
        SketchForge.showToast('Capa duplicada', 'success');
    },

    deleteActiveLayer() {
        const items = document.querySelectorAll('.layer-item');
        if (items.length <= 1) {
            SketchForge.showToast('No se puede eliminar la última capa', 'error');
            return;
        }

        const active = document.querySelector('.layer-item.active');
        if (!active) return;

        const next = active.nextElementSibling || active.previousElementSibling;
        active.remove();
        if (next) {
            next.classList.add('active');
            this.selectLayer(next);
        }
        SketchForge.saveState();
        SketchForge.showToast('Capa eliminada', 'info');
    },

    moveLayer(direction) {
        const active = document.querySelector('.layer-item.active');
        if (!active) return;

        const list = document.getElementById('layersList');
        const items = Array.from(list.children);
        const idx = items.indexOf(active);

        if (direction === -1 && idx > 0) {
            list.insertBefore(active, items[idx - 1]);
        } else if (direction === 1 && idx < items.length - 1) {
            list.insertBefore(items[idx + 1], active);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    SketchForgeLayers.init();
});
