class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('selectedLang') || 'zh-TW';
        this.init();
    }

    init() {
        if (window.translations) {
            this.updateDOM();
            this.updateLanguageToggleUI();
        } else {
            console.error('Translations dictionary not found.');
        }
    }

    t(key, params = {}) {
        const langData = window.translations[this.currentLang] || window.translations['zh-TW'];
        let translation = langData[key] || key;

        Object.keys(params).forEach(param => {
            translation = translation.replace(`{${param}}`, params[param]);
        });

        return translation;
    }

    setLanguage(lang) {
        if (window.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('selectedLang', lang);
            this.updateDOM();
            this.updateLanguageToggleUI();
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
            document.documentElement.lang = lang;
        }
    }

    updateDOM() {
        const elements = document.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-alt], [data-i18n-title]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) {
                const translation = this.t(key);
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    if (el.type === 'submit' || el.type === 'button') {
                        el.value = translation;
                    }
                } else {
                    el.innerHTML = translation;
                }
            }

            const placeholderKey = el.getAttribute('data-i18n-placeholder');
            if (placeholderKey) {
                el.placeholder = this.t(placeholderKey);
            }

            const altKey = el.getAttribute('data-i18n-alt');
            if (altKey) {
                el.alt = this.t(altKey);
            }

            const titleKey = el.getAttribute('data-i18n-title');
            if (titleKey) {
                el.title = this.t(titleKey);
            }
        });

        document.querySelectorAll('select.lang-select').forEach(select => {
            select.value = this.currentLang;
        });

        const titleEl = document.querySelector('title[data-i18n]');
        if (titleEl) {
            document.title = this.t(titleEl.getAttribute('data-i18n'));
        }
    }

    updateLanguageToggleUI() {
        const selectElements = document.querySelectorAll('.lang-select');
        selectElements.forEach(select => {
            select.value = this.currentLang;
            if (!select.dataset.listenerAdded) {
                select.addEventListener('change', (e) => {
                    this.setLanguage(e.target.value);
                });
                select.dataset.listenerAdded = 'true';
            }
        });

        const toggles = document.querySelectorAll('.lang-toggle-btn');
        toggles.forEach(btn => {
            if (btn.getAttribute('data-lang') === this.currentLang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}

window.i18n = new I18n();
window.t = (key, params) => window.i18n.t(key, params);
