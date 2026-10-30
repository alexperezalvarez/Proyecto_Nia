(function() {
    const STORAGE_KEY = 'sketchforge-theme';
    const TRANSITION_CLASS = 'sf-theme-transition';
    const TRANSITION_MS = 480;
    let transitionTimer = null;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function getTheme() {
        return localStorage.getItem(STORAGE_KEY) || 'dark';
    }

    function applyTheme(theme) {
        localStorage.setItem(STORAGE_KEY, theme);
        document.documentElement.setAttribute('data-theme', theme);
        document.body.style.background = '';
        document.body.style.color = '';

        const icon = document.querySelector('.theme-toggle i');
        if (icon) {
            icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
        }

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', theme === 'dark' ? '#070a16' : '#eef3fb');
        }
    }

    function fallbackTransition(theme) {
        const root = document.documentElement;
        root.classList.add(TRANSITION_CLASS);
        applyTheme(theme);
        window.clearTimeout(transitionTimer);
        transitionTimer = window.setTimeout(() => {
            root.classList.remove(TRANSITION_CLASS);
        }, TRANSITION_MS);
    }

    function setTheme(theme, animate) {
        if (!animate || reduceMotion.matches) {
            applyTheme(theme);
            return;
        }

        if (typeof document.startViewTransition === 'function') {
            document.startViewTransition(() => applyTheme(theme));
            return;
        }

        fallbackTransition(theme);
    }

    function toggleTheme() {
        const current = getTheme();
        setTheme(current === 'dark' ? 'light' : 'dark', true);
    }

    document.addEventListener('DOMContentLoaded', function() {
        setTheme(getTheme(), false);
        const btn = document.querySelector('.theme-toggle');
        if (btn) {
            btn.addEventListener('click', toggleTheme);
        }
    });
})();
