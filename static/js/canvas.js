const SketchForge = {
    canvas: null,
    ctx: null,
    drawCanvas: null,
    drawCtx: null,
    currentTool: 'brush',
    isDrawing: false,
    isPanning: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    history: [],
    historyIndex: -1,
    maxHistory: 50,
    layers: [],
    currentLayerIndex: 0,
    layerCounter: 1,
    zoom: 1,
    minZoom: 0.1,
    maxZoom: 10,
    panX: 0,
    panY: 0,
    spaceHeld: false,
    lastPinchDist: 0,

    init() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.drawCanvas = document.getElementById('drawCanvas');
        this.drawCtx = this.drawCanvas.getContext('2d');

        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
        this.drawCanvas.width = CANVAS_WIDTH;
        this.drawCanvas.height = CANVAS_HEIGHT;

        this.setupCanvas();
        this.setupTools();
        this.setupEvents();
        this.setupKeyboard();
        this.setupZoom();
        this.setupColorPresets();
        this.setupColorSync();
        this.saveState();

        document.getElementById('saveBtn').addEventListener('click', () => this.saveDrawing());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearLayer());

        this.zoomFit();
        this.updateStatus('Pincel');
    },

    setupCanvas() {
        const container = document.getElementById('canvasContainer');
        container.style.width = CANVAS_WIDTH + 'px';
        container.style.height = CANVAS_HEIGHT + 'px';

        this.canvas.style.width = CANVAS_WIDTH + 'px';
        this.canvas.style.height = CANVAS_HEIGHT + 'px';
        this.drawCanvas.style.width = CANVAS_WIDTH + 'px';
        this.drawCanvas.style.height = CANVAS_HEIGHT + 'px';

        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    },

    setupTools() {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
                this.updateCursor();
                this.updateStatus(this.getToolName(this.currentTool));
            });
        });
    },

    getToolName(tool) {
        const names = {
            brush: 'Pincel', eraser: 'Borrador', line: 'Línea',
            rect: 'Rectángulo', circle: 'Elipse', fill: 'Relleno',
            eyedropper: 'Cuentagotas', hand: 'Mano', zoom: 'Zoom'
        };
        return names[tool] || tool;
    },

    updateCursor() {
        const cursors = {
            brush: 'crosshair', eraser: 'crosshair', line: 'crosshair',
            rect: 'crosshair', circle: 'crosshair', fill: 'crosshair',
            eyedropper: 'crosshair', hand: 'grab', zoom: 'zoom-in'
        };
        this.drawCanvas.style.cursor = cursors[this.currentTool] || 'crosshair';
    },

    setupEvents() {
        const el = this.drawCanvas;

        el.addEventListener('mousedown', (e) => this.startDraw(e));
        el.addEventListener('mousemove', (e) => this.draw(e));
        el.addEventListener('mouseup', (e) => this.endDraw(e));
        el.addEventListener('mouseleave', (e) => this.endDraw(e));

        el.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 2) {
                this.lastPinchDist = this.getPinchDist(e);
                return;
            }
            const touch = e.touches[0];
            this.startDraw({ clientX: touch.clientX, clientY: touch.clientY, button: 0 });
        });
        el.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 2) {
                const dist = this.getPinchDist(e);
                if (this.lastPinchDist) {
                    const delta = dist / this.lastPinchDist;
                    this.setZoom(this.zoom * delta);
                }
                this.lastPinchDist = dist;
                return;
            }
            const touch = e.touches[0];
            this.draw({ clientX: touch.clientX, clientY: touch.clientY });
        });
        el.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.lastPinchDist = 0;
            this.endDraw({});
        });

        const wrapper = document.getElementById('canvasWrapper');
        wrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                this.setZoom(this.zoom * delta);
            } else {
                this.setZoom(this.zoom * (e.deltaY > 0 ? 0.95 : 1.05));
            }
        }, { passive: false });
    },

    getPinchDist(e) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    },

    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

            if (e.key === ' ') {
                e.preventDefault();
                this.spaceHeld = true;
                this.drawCanvas.style.cursor = 'grab';
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) this.redo(); else this.undo();
                        return;
                    case 's':
                        e.preventDefault();
                        this.saveDrawing();
                        return;
                    case '=': case '+':
                        e.preventDefault();
                        this.zoomIn();
                        return;
                    case '-':
                        e.preventDefault();
                        this.zoomOut();
                        return;
                    case '0':
                        e.preventDefault();
                        this.zoomFit();
                        return;
                    case '1':
                        e.preventDefault();
                        this.zoomReset();
                        return;
                }
                return;
            }

            const toolKeys = {
                'b': 'brush', 'e': 'eraser', 'l': 'line', 'u': 'rect',
                'o': 'circle', 'g': 'fill', 'i': 'eyedropper',
                'h': 'hand', 'z': 'zoom'
            };

            if (toolKeys[e.key.toLowerCase()]) {
                const tool = toolKeys[e.key.toLowerCase()];
                document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
                const btn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
                if (btn) {
                    btn.classList.add('active');
                    this.currentTool = tool;
                    this.updateCursor();
                    this.updateStatus(this.getToolName(tool));
                }
                return;
            }

            if (e.key === '[') {
                const sizeInput = document.getElementById('brushSize');
                sizeInput.value = Math.max(1, parseInt(sizeInput.value) - (e.shiftKey ? 10 : 1));
                sizeInput.dispatchEvent(new Event('input'));
            }
            if (e.key === ']') {
                const sizeInput = document.getElementById('brushSize');
                sizeInput.value = Math.min(200, parseInt(sizeInput.value) + (e.shiftKey ? 10 : 1));
                sizeInput.dispatchEvent(new Event('input'));
            }

            if (e.key === 'Delete') {
                this.clearLayer();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === ' ') {
                this.spaceHeld = false;
                this.updateCursor();
            }
        });
    },

    setupZoom() {
        this.updateZoomDisplay();
    },

    setupColorPresets() {
        const presets = [
            '#000000','#434343','#666666','#999999','#b7b7b7','#cccccc','#d9d9d9','#efefef','#f3f3f3','#ffffff',
            '#980000','#ff0000','#ff9900','#ffff00','#00ff00','#00ffff','#4a86e8','#0000ff','#9900ff','#ff00ff',
            '#e6b8af','#f4cccc','#fce5cd','#fff2cc','#d9ead3','#d0e0e3','#c9daf8','#cfe2f3','#d9d2e9','#ead1dc',
            '#dd7e6b','#ea9999','#f9cb9c','#ffe599','#b6d7a8','#a2c4c9','#a4c2f4','#9fc5e8','#b4a7d6','#d5a6bd',
            '#cc4125','#e06666','#f6b26b','#ffd966','#93c47d','#76a5af','#6d9eeb','#6fa8dc','#8e7cc3','#c27ba0',
            '#a61c00','#cc0000','#e69138','#f1c232','#6aa84f','#45818e','#3c78d8','#3d85c6','#674ea7','#a64d79',
            '#85200c','#990000','#b45f06','#bf9000','#38761d','#134f5c','#1155cc','#0b5394','#351c75','#741b47',
            '#5b0f00','#660000','#783f04','#7f6000','#274e13','#0c343d','#1c4587','#073763','#20124d','#4c1130'
        ];

        const container = document.getElementById('colorPresets');
        if (!container) return;
        container.innerHTML = '';
        presets.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-preset';
            swatch.style.background = color;
            swatch.title = color;
            swatch.addEventListener('click', () => {
                document.getElementById('brushColor').value = color;
                document.getElementById('colorFg').style.background = color;
                document.getElementById('hexInput').value = color;
                document.getElementById('brushColorPicker').value = color;
            });
            container.appendChild(swatch);
        });
    },

    setupColorSync() {
        const brushColor = document.getElementById('brushColor');
        const hexInput = document.getElementById('hexInput');
        const colorPicker = document.getElementById('brushColorPicker');
        const colorFg = document.getElementById('colorFg');

        if (hexInput) {
            hexInput.addEventListener('input', (e) => {
                let val = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                    brushColor.value = val;
                    colorFg.style.background = val;
                    colorPicker.value = val;
                }
            });
            hexInput.addEventListener('blur', (e) => {
                let val = e.target.value;
                if (!val.startsWith('#')) val = '#' + val;
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                    brushColor.value = val;
                    colorFg.style.background = val;
                    colorPicker.value = val;
                } else {
                    e.target.value = brushColor.value;
                }
            });
        }

        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                brushColor.value = e.target.value;
                colorFg.style.background = e.target.value;
                if (hexInput) hexInput.value = e.target.value;
            });
        }

        brushColor.addEventListener('input', (e) => {
            colorFg.style.background = e.target.value;
            if (hexInput) hexInput.value = e.target.value;
            if (colorPicker) colorPicker.value = e.target.value;
        });

        const swapBtn = document.getElementById('colorSwapBtn');
        if (swapBtn) {
            swapBtn.addEventListener('click', () => {
                const fg = brushColor.value;
                const bg = document.getElementById('colorBg').style.background || '#ffffff';
                brushColor.value = bg;
                colorFg.style.background = bg;
                document.getElementById('colorBg').style.background = fg;
                if (hexInput) hexInput.value = bg;
                if (colorPicker) colorPicker.value = bg;
            });
        }
    },

    getPos(e) {
        const wrapper = document.getElementById('canvasWrapper');
        const wRect = wrapper.getBoundingClientRect();
        const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

        const mx = clientX - wRect.left;
        const my = clientY - wRect.top;

        const vw = CANVAS_WIDTH * this.zoom;
        const vh = CANVAS_HEIGHT * this.zoom;

        const containerLeft = (wRect.width - vw) / 2 + this.panX;
        const containerTop = (wRect.height - vh) / 2 + this.panY;

        return {
            x: ((mx - containerLeft) / vw) * CANVAS_WIDTH,
            y: ((my - containerTop) / vh) * CANVAS_HEIGHT
        };
    },

    startDraw(e) {
        if (this.spaceHeld || this.currentTool === 'hand') {
            this.isPanning = true;
            this.lastX = e.clientX || (e.touches && e.touches[0].clientX);
            this.lastY = e.clientY || (e.touches && e.touches[0].clientY);
            this.drawCanvas.style.cursor = 'grabbing';
            return;
        }

        if (this.currentTool === 'zoom') {
            if (e.shiftKey || (e.button === 2)) {
                this.zoomOut();
            } else {
                this.zoomIn();
            }
            return;
        }

        const pos = this.getPos(e);
        this.isDrawing = true;
        this.startX = pos.x;
        this.startY = pos.y;

        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            this.drawCtx.beginPath();
            this.drawCtx.moveTo(pos.x, pos.y);
        }

        if (this.currentTool === 'fill') {
            const color = document.getElementById('brushColor').value;
            this.floodFill(Math.round(pos.x), Math.round(pos.y), color);
            this.isDrawing = false;
        }

        if (this.currentTool === 'eyedropper') {
            this.pickColor(pos.x, pos.y);
            this.isDrawing = false;
        }
    },

    draw(e) {
        this.updateCoords(e);

        if (this.isPanning) {
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            const dx = clientX - this.lastX;
            const dy = clientY - this.lastY;
            const container = document.getElementById('canvasContainer');
            this.panX += dx;
            this.panY += dy;
            container.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
            this.lastX = clientX;
            this.lastY = clientY;
            return;
        }

        if (!this.isDrawing) return;
        const pos = this.getPos(e);
        const ctx = this.drawCtx;
        const color = this.currentTool === 'eraser' ? '#FFFFFF' : document.getElementById('brushColor').value;
        const size = parseInt(document.getElementById('brushSize').value);
        const opacity = parseInt(document.getElementById('brushOpacity').value) / 100;
        const flow = parseInt(document.getElementById('brushFlow')?.value || 100) / 100;

        ctx.save();
        ctx.globalAlpha = opacity * flow;

        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            ctx.strokeStyle = color;
            ctx.lineWidth = size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        } else if (this.currentTool === 'line' || this.currentTool === 'rect' || this.currentTool === 'circle') {
            this.drawPreview(pos, color, size);
        }

        ctx.restore();
    },

    drawPreview(pos, color, size) {
        const ctx = this.drawCtx;
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';

        if (this.currentTool === 'line') {
            ctx.beginPath();
            ctx.moveTo(this.startX, this.startY);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        } else if (this.currentTool === 'rect') {
            ctx.strokeRect(this.startX, this.startY, pos.x - this.startX, pos.y - this.startY);
        } else if (this.currentTool === 'circle') {
            const rx = Math.abs(pos.x - this.startX) / 2;
            const ry = Math.abs(pos.y - this.startY) / 2;
            const cx = this.startX + (pos.x - this.startX) / 2;
            const cy = this.startY + (pos.y - this.startY) / 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    },

    endDraw(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.updateCursor();
            return;
        }

        if (!this.isDrawing) return;
        this.isDrawing = false;

        if (this.currentTool === 'line' || this.currentTool === 'rect' || this.currentTool === 'circle') {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = CANVAS_WIDTH;
            tempCanvas.height = CANVAS_HEIGHT;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(this.drawCanvas, 0, 0);
            this.ctx.drawImage(tempCanvas, 0, 0);
            this.drawCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            this.ctx.drawImage(this.drawCanvas, 0, 0);
            this.drawCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        this.saveState();
    },

    pickColor(x, y) {
        const pixel = this.ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
        const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
        document.getElementById('brushColor').value = hex;
        document.getElementById('colorFg').style.background = hex;
        document.getElementById('hexInput').value = hex;
        document.getElementById('brushColorPicker').value = hex;
        this.showToast(`Color seleccionado: ${hex}`, 'info');
    },

    floodFill(startX, startY, fillColor) {
        const imageData = this.ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const data = imageData.data;
        const targetColor = this.getPixel(data, startX, startY);
        const fill = this.hexToRgb(fillColor);

        if (targetColor.r === fill.r && targetColor.g === fill.g && targetColor.b === fill.b) return;

        const stack = [[startX, startY]];
        const visited = new Set();
        const width = CANVAS_WIDTH;
        const height = CANVAS_HEIGHT;

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const key = x + ',' + y;
            if (visited.has(key)) continue;
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            visited.add(key);

            const pixel = this.getPixel(data, x, y);
            if (pixel.r !== targetColor.r || pixel.g !== targetColor.g || pixel.b !== targetColor.b) continue;

            const idx = (y * width + x) * 4;
            data[idx] = fill.r;
            data[idx + 1] = fill.g;
            data[idx + 2] = fill.b;
            data[idx + 3] = 255;

            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        this.ctx.putImageData(imageData, 0, 0);
    },

    getPixel(data, x, y) {
        const idx = (y * CANVAS_WIDTH + x) * 4;
        return { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] };
    },

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    },

    // ===== ZOOM =====
    setZoom(newZoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        const container = document.getElementById('canvasContainer');
        container.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        this.updateZoomDisplay();
        this.showZoomIndicator();
    },

    zoomIn() {
        this.setZoom(this.zoom * 1.25);
    },

    zoomOut() {
        this.setZoom(this.zoom / 1.25);
    },

    zoomFit() {
        const wrapper = document.getElementById('canvasWrapper');
        if (!wrapper) return;
        const ww = wrapper.clientWidth - 40;
        const wh = wrapper.clientHeight - 40;
        const scaleX = ww / CANVAS_WIDTH;
        const scaleY = wh / CANVAS_HEIGHT;
        this.zoom = Math.min(scaleX, scaleY, 1);
        this.panX = 0;
        this.panY = 0;
        const container = document.getElementById('canvasContainer');
        container.style.transform = `translate(0px, 0px) scale(${this.zoom})`;
        this.updateZoomDisplay();
    },

    zoomReset() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        const container = document.getElementById('canvasContainer');
        container.style.transform = `translate(0px, 0px) scale(1)`;
        this.updateZoomDisplay();
    },

    updateZoomDisplay() {
        const input = document.getElementById('zoomInput');
        if (input) {
            input.value = Math.round(this.zoom * 100) + '%';
        }
    },

    showZoomIndicator() {
        const indicator = document.getElementById('zoomIndicator');
        if (!indicator) return;
        indicator.textContent = Math.round(this.zoom * 100) + '%';
        indicator.classList.add('visible');
        clearTimeout(this._zoomTimeout);
        this._zoomTimeout = setTimeout(() => {
            indicator.classList.remove('visible');
        }, 800);
    },

    // ===== HISTORY =====
    saveState() {
        const data = this.canvas.toDataURL();
        this.historyIndex++;
        this.history = this.history.slice(0, this.historyIndex);
        this.history.push(data);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyIndex--;
        }
    },

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState();
            this.showToast('Deshacer', 'info');
        }
    },

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState();
            this.showToast('Rehacer', 'info');
        }
    },

    restoreState() {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = this.history[this.historyIndex];
    },

    clearLayer() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.saveState();
        this.showToast('Capa limpiada', 'info');
    },

    // ===== FILTERS =====
    applyFilter(filter) {
        const imageData = this.ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const data = imageData.data;

        switch(filter) {
            case 'grayscale':
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i+1] + data[i+2]) / 3;
                    data[i] = data[i+1] = data[i+2] = avg;
                }
                break;
            case 'invert':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = 255 - data[i];
                    data[i+1] = 255 - data[i+1];
                    data[i+2] = 255 - data[i+2];
                }
                break;
            case 'brightness':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] + 30);
                    data[i+1] = Math.min(255, data[i+1] + 30);
                    data[i+2] = Math.min(255, data[i+2] + 30);
                }
                break;
            case 'blur':
                this.simpleBlur(imageData);
                break;
        }

        this.ctx.putImageData(imageData, 0, 0);
        this.saveState();
        this.showToast('Filtro aplicado: ' + filter, 'success');
    },

    simpleBlur(imageData) {
        const w = CANVAS_WIDTH;
        const h = CANVAS_HEIGHT;
        const src = new Uint8ClampedArray(imageData.data);
        const dst = imageData.data;
        const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
        const kSum = 16;

        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                let r = 0, g = 0, b = 0;
                let ki = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * w + (x + kx)) * 4;
                        r += src[idx] * kernel[ki];
                        g += src[idx + 1] * kernel[ki];
                        b += src[idx + 2] * kernel[ki];
                        ki++;
                    }
                }
                const idx = (y * w + x) * 4;
                dst[idx] = r / kSum;
                dst[idx + 1] = g / kSum;
                dst[idx + 2] = b / kSum;
            }
        }
    },

    // ===== UI HELPERS =====
    updateCoords(e) {
        const pos = this.getPos(e);
        const coordsEl = document.getElementById('statusCoords');
        if (coordsEl) {
            coordsEl.textContent = `X: ${Math.round(pos.x)}  Y: ${Math.round(pos.y)}`;
        }
    },

    updateStatus(toolName) {
        const toolEl = document.getElementById('statusTool');
        if (toolEl) toolEl.textContent = toolName;
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `ps-toast ${type}`;
        toast.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    },

    newDrawing() {
        if (confirm('Crear un nuevo dibujo? Los cambios no guardados se perderán.')) {
            window.location.href = SAVE_DRAWING_URL.replace('save', 'new');
        }
    },

    saveDrawing() {
        const data = this.canvas.toDataURL();
        $.ajax({
            url: SAVE_URL,
            method: 'POST',
            headers: { 'X-CSRFToken': CSRF_TOKEN },
            contentType: 'application/json',
            data: JSON.stringify({
                layer_id: null,
                name: 'Capa 1',
                data: { image: data },
                opacity: 1.0,
                visible: true
            }),
            success: () => {
                this.showToast('Dibujo guardado correctamente', 'success');
            },
            error: () => {
                this.showToast('Error al guardar', 'error');
            }
        });
    }
};
