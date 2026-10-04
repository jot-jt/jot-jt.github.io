(function () {
    const root = document.documentElement;
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    let preference = null;
    try {
        const saved = localStorage.getItem('site-theme');
        if (saved === 'light' || saved === 'dark') preference = saved;
    } catch (_) { /* Use the system preference when storage is unavailable. */ }

    function apply() {
        const dark = preference ? preference === 'dark' : system.matches;
        root.dataset.theme = dark ? 'dark' : 'light';
        const button = document.querySelector('.theme-toggle');
        if (button) button.setAttribute('aria-pressed', String(dark));
        window.dispatchEvent(new Event('theme-change'));
    }

    apply();
    system.addEventListener('change', function () { if (!preference) apply(); });
    window.addEventListener('storage', function (event) {
        if (event.key !== 'site-theme' && event.key !== null) return;
        preference = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : null;
        apply();
    });
    document.addEventListener('DOMContentLoaded', function () {
        const button = document.querySelector('.theme-toggle');
        if (!button) return;
        button.hidden = false;
        apply();
        button.addEventListener('click', function () {
            preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem('site-theme', preference); } catch (_) { /* Keep this session's choice. */ }
            apply();
        });
    });
})();
