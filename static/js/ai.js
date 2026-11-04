const SketchForgeAI = {
    init() {
        const btnAi = document.getElementById('aiGenerateBtn');
        if (btnAi) btnAi.addEventListener('click', () => this.generate());
        const btnNano = document.getElementById('aiNanoBtn');
        if (btnNano) btnNano.addEventListener('click', () => this.generateNano());
        const promptEl = document.getElementById('aiPrompt');
        if (promptEl) {
            promptEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.generate();
                }
            });
        }
    },

    generate() {
        const prompt = document.getElementById('aiPrompt').value.trim();
        const style = document.getElementById('aiStyle').value;
        const resultDiv = document.getElementById('aiResult');

        if (!prompt) {
            resultDiv.innerHTML = '<div style="background:rgba(255,152,0,0.15);border:1px solid rgba(255,152,0,0.3);color:#ff9800;padding:6px 10px;border-radius:4px;font-size:11px">Escribe una descripción</div>';
            return;
        }

        const btn = document.getElementById('aiGenerateBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Generando...';

        resultDiv.innerHTML = '<div style="text-align:center;padding:12px;color:var(--ps-text-dim);font-size:11px"><div class="spinner-border spinner-border-sm mb-1"></div><br>Generando imagen...</div>';

        $.ajax({
            url: AI_URL,
            method: 'POST',
            headers: { 'X-CSRFToken': CSRF_TOKEN },
            contentType: 'application/json',
            data: JSON.stringify({ prompt, style }),
            success: (resp) => {
                if (resp.status === 'ok' && resp.image_url) {
                    resultDiv.innerHTML = `
                        <div style="position:relative">
                            <img src="${resp.image_url}" alt="IA Generated" style="width:100%;border-radius:4px;border:1px solid var(--ps-border-light)">
                            <button class="ps-btn ps-btn-primary ps-btn-block mt-2 use-ai-btn" style="font-size:11px">
                                <i class="bi bi-arrow-down-circle me-1"></i> Usar en Lienzo
                            </button>
                        </div>
                    `;
                    resultDiv.querySelector('.use-ai-btn').addEventListener('click', () => {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.onload = () => {
                            SketchForge.ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                            SketchForge.saveState();
                            SketchForge.showToast('Imagen aplicada al lienzo', 'success');
                        };
                        img.src = resp.image_url;
                    });
                } else if (resp.status === 'no_credits' || resp.status === 'rate_limit') {
                    const billingLink = resp.status === 'no_credits'
                        ? '<br><a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noopener" style="color:#00e5ff">Abrir facturación de OpenAI</a>'
                        : '';
                    resultDiv.innerHTML = `
                        <div style="background:rgba(255,152,0,0.1);border:1px solid rgba(255,152,0,0.25);padding:8px;border-radius:4px;font-size:11px;color:#ff9800">
                            <i class="bi bi-exclamation-triangle me-1"></i> ${resp.message}
                            ${billingLink}
                        </div>
                    `;
                } else if (resp.status === 'no_access') {
                    const hint = resp.hint ? `<br><small style="opacity:0.8">${resp.hint}</small>` : '';
                    resultDiv.innerHTML = `
                        <div style="background:rgba(255,152,0,0.1);border:1px solid rgba(255,152,0,0.2);padding:8px;border-radius:4px;font-size:11px;margin-bottom:8px;color:#ff9800">
                            <i class="bi bi-exclamation-triangle me-1"></i> ${resp.message}${hint}
                        </div>
                        <button class="ps-btn ps-btn-block use-gpt-btn" style="font-size:11px">
                            <i class="bi bi-chat-dots me-1"></i> Obtener ideas con GPT-4o
                        </button>
                    `;
                    resultDiv.querySelector('.use-gpt-btn').addEventListener('click', () => {
                        this.getGptIdeas(prompt, style, resultDiv);
                    });
                } else if (resp.status === 'demo') {
                    resultDiv.innerHTML = `
                        <div style="background:rgba(45,140,235,0.1);border:1px solid rgba(45,140,235,0.2);padding:8px;border-radius:4px;font-size:11px;color:#2d8ceb">
                            <i class="bi bi-info-circle me-1"></i> ${resp.message}<br>
                            <small style="opacity:0.8">${resp.hint}</small>
                        </div>
                    `;
                } else {
                    resultDiv.innerHTML = `<div style="background:rgba(244,67,54,0.1);border:1px solid rgba(244,67,54,0.2);padding:6px 10px;border-radius:4px;font-size:11px;color:#f44336">Error: ${resp.message}</div>`;
                }
            },
            error: () => {
                resultDiv.innerHTML = '<div style="background:rgba(244,67,54,0.1);border:1px solid rgba(244,67,54,0.2);padding:6px 10px;border-radius:4px;font-size:11px;color:#f44336">Error de conexión</div>';
            },
            complete: () => {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-stars me-1"></i> Generar con IA';
            }
        });
    },

    getGptIdeas(prompt, style, resultDiv) {
        resultDiv.innerHTML = '<div style="text-align:center;padding:12px;color:var(--ps-text-dim);font-size:11px"><div class="spinner-border spinner-border-sm mb-1"></div><br>Consultando a GPT-4o...</div>';

        $.ajax({
            url: '/canvas/ai-ideas/',
            method: 'POST',
            headers: { 'X-CSRFToken': CSRF_TOKEN },
            contentType: 'application/json',
            data: JSON.stringify({
                prompt,
                style,
                lang: typeof SFI18N !== 'undefined' ? SFI18N.getLang() : 'es'
            }),
            success: (resp) => {
                if (resp.status === 'ok') {
                    resultDiv.innerHTML = `
                        <div style="background:rgba(45,140,235,0.1);border:1px solid rgba(45,140,235,0.2);padding:8px;border-radius:4px;font-size:11px;color:var(--ps-text)">
                            <strong style="color:#2d8ceb"><i class="bi bi-lightbulb me-1"></i> Ideas creativas:</strong><br>
                            <div data-no-i18n style="margin-top:6px;line-height:1.6">${resp.ideas.replace(/\n/g, '<br>')}</div>
                        </div>
                    `;
                } else {
                    resultDiv.innerHTML = `<div style="background:rgba(244,67,54,0.1);border:1px solid rgba(244,67,54,0.2);padding:6px 10px;border-radius:4px;font-size:11px;color:#f44336">${resp.message}</div>`;
                }
            },
            error: () => {
                resultDiv.innerHTML = '<div style="background:rgba(244,67,54,0.1);border:1px solid rgba(244,67,54,0.2);padding:6px 10px;border-radius:4px;font-size:11px;color:#f44336">Error de conexión</div>';
            }
        });
    },

    generateNano() {
        const prompt = document.getElementById('aiPrompt').value.trim();
        const resultDiv = document.getElementById('aiResult');

        if (!prompt) {
            resultDiv.innerHTML = '<div style="background:rgba(255,152,0,0.15);border:1px solid rgba(255,152,0,0.3);color:#ff9800;padding:6px 10px;border-radius:4px;font-size:11px">Escribe una descripción</div>';
            return;
        }

        const btn = document.getElementById('aiNanoBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Generando...';
        }

        resultDiv.innerHTML = '<div style="text-align:center;padding:12px;color:var(--ps-text-dim);font-size:11px"><div class="spinner-border spinner-border-sm mb-1"></div><br>Generando con NanoBanana...</div>';

        $.ajax({
            url: typeof AI_NANO_URL !== 'undefined' ? AI_NANO_URL : '/canvas/ai-nano/',
            method: 'POST',
            headers: { 'X-CSRFToken': CSRF_TOKEN },
            contentType: 'application/json',
            data: JSON.stringify({ prompt: prompt }),
            success: (resp) => {
                if (resp.status === 'ok' && resp.image_url) {
                    resultDiv.innerHTML = `
                        <div style="position:relative">
                            <img src="${resp.image_url}" alt="NanoBanana" style="width:100%;border-radius:4px;border:1px solid var(--ps-border-light)">
                            <button class="ps-btn ps-btn-primary ps-btn-block mt-2 use-nano-btn" style="font-size:11px">
                                <i class="bi bi-arrow-down-circle me-1"></i> Usar en Lienzo
                            </button>
                        </div>
                    `;
                    resultDiv.querySelector('.use-nano-btn').addEventListener('click', () => {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.onload = () => {
                            if (typeof SketchForge !== 'undefined' && SketchForge.ctx) {
                                SketchForge.ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                                if (typeof SketchForge.saveState === 'function') SketchForge.saveState();
                                if (typeof SketchForge.showToast === 'function') SketchForge.showToast('Imagen aplicada al lienzo', 'success');
                            }
                        };
                        img.src = resp.image_url;
                    });
                } else {
                    resultDiv.innerHTML = `<div style="background:rgba(244,67,54,0.1);border:1px solid rgba(244,67,54,0.2);padding:6px 10px;border-radius:4px;font-size:11px;color:#f44336">Error: ${resp.message || 'Error al generar'}</div>`;
                }
            },
            error: () => {
                resultDiv.innerHTML = '<div style="background:rgba(244,67,54,0.1);border:1px solid rgba(244,67,54,0.2);padding:6px 10px;border-radius:4px;font-size:11px;color:#f44336">Error de conexión</div>';
            },
            complete: () => {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-stars me-1"></i> Generar con NanoBanana';
                }
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    SketchForgeAI.init();
});
