(function() {
    const STORAGE_KEY = 'sketchforge-theme';

    function getTheme() {
        return localStorage.getItem(STORAGE_KEY) || 'dark';
    }

    function setTheme(theme) {
        localStorage.setItem(STORAGE_KEY, theme);
        document.documentElement.setAttribute('data-theme', theme);
        const icon = document.querySelector('.theme-toggle i');
        if (icon) {
            icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
        }

        if (theme === 'light') {
            document.body.style.background = '#f0f2f5';
            document.body.style.color = '#2D3436';
        } else {
            document.body.style.background = '#2c2c2c';
            document.body.style.color = '#cccccc';
        }
    }

    function toggleTheme() {
        const current = getTheme();
        setTheme(current === 'dark' ? 'light' : 'dark');
    }

    document.addEventListener('DOMContentLoaded', function() {
        setTheme(getTheme());
        const btn = document.querySelector('.theme-toggle');
        if (btn) {
            btn.addEventListener('click', toggleTheme);
        }
    });
})();
