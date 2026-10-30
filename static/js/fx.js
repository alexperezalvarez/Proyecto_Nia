(function() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function initCursorGlow() {
        if (reduceMotion || window.matchMedia('(max-width: 768px)').matches) return;
        if (document.querySelector('.editor-container')) return;
        const glow = document.querySelector('.sf-cursor-glow');
        if (!glow) return;

        let raf = null;
        let targetX = 0;
        let targetY = 0;

        window.addEventListener('pointermove', function(e) {
            targetX = e.clientX;
            targetY = e.clientY;
            document.body.classList.add('sf-pointer-active');

            if (raf) return;
            raf = requestAnimationFrame(function() {
                glow.style.left = targetX + 'px';
                glow.style.top = targetY + 'px';
                raf = null;
            });
        });

        document.addEventListener('pointerleave', function() {
            document.body.classList.remove('sf-pointer-active');
        });
    }

    function initParticles() {
        if (reduceMotion) return;
        if (document.querySelector('.editor-container')) return;
        const canvas = document.getElementById('sfParticles');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const isEditor = false;
        const COUNT = isEditor ? 22 : 54;
        const LINK_DIST = isEditor ? 110 : 150;
        const COLORS = ['0, 229, 255', '123, 97, 255', '255, 43, 214'];

        let width = 0;
        let height = 0;
        let dpr = 1;
        let particles = [];
        let running = true;

        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            spawn();
        }

        function spawn() {
            particles = [];
            for (let i = 0; i < COUNT; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.28,
                    vy: (Math.random() - 0.5) * 0.28,
                    r: Math.random() * 1.6 + 0.6,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)]
                });
            }
        }

        function draw() {
            if (!running) return;
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < -20) p.x = width + 20;
                if (p.x > width + 20) p.x = -20;
                if (p.y < -20) p.y = height + 20;
                if (p.y > height + 20) p.y = -20;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + p.color + ', 0.55)';
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(' + p.color + ', 0.7)';
                ctx.fill();
                ctx.shadowBlur = 0;

                for (let j = i + 1; j < particles.length; j++) {
                    const q = particles[j];
                    const dx = p.x - q.x;
                    const dy = p.y - q.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < LINK_DIST) {
                        const alpha = (1 - dist / LINK_DIST) * (isEditor ? 0.08 : 0.16);
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.strokeStyle = 'rgba(' + p.color + ', ' + alpha + ')';
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(draw);
        }

        window.addEventListener('resize', resize);
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                running = false;
            } else if (!running) {
                running = true;
                draw();
            }
        });

        resize();
        draw();
    }

    document.addEventListener('DOMContentLoaded', function() {
        initCursorGlow();
        initParticles();
    });
})();
