(function() {
    const STORAGE_KEY = 'sketchforge-lang';
    const SUPPORTED = ['es', 'en'];
    const DEFAULT_LANG = 'es';

    const MONTHS = {
        ene: 'January', enero: 'January', jan: 'January', january: 'January',
        feb: 'February', febrero: 'February', february: 'February',
        mar: 'March', marzo: 'March', march: 'March',
        abr: 'April', abril: 'April', apr: 'April', april: 'April',
        may: 'May', mayo: 'May',
        jun: 'June', junio: 'June', june: 'June',
        jul: 'July', julio: 'July', july: 'July',
        ago: 'August', agosto: 'August', aug: 'August', august: 'August',
        sep: 'September', sept: 'September', septiembre: 'September',
        september: 'September',
        oct: 'October', octubre: 'October', october: 'October',
        nov: 'November', noviembre: 'November', november: 'November',
        dic: 'December', diciembre: 'December', dec: 'December', december: 'December'
    };

    const dictionary = {
        'Editor': 'Editor',
        'Galería': 'Gallery',
        'Cambiar tema': 'Toggle theme',
        'Cambiar idioma': 'Change language',
        'Idioma': 'Language',
        'Perfil': 'Profile',
        'Mis Dibujos': 'My Drawings',
        'Cerrar Sesión': 'Sign Out',
        'Iniciar Sesión': 'Sign In',
        'Inicia Sesión': 'Sign In',
        'Registrarse': 'Sign Up',
        'Registro': 'Sign Up',
        'Cerrar': 'Close',
        'Español': 'Spanish',

        'Editor de arte digital con IA integrada': 'Digital art editor with integrated AI',
        'Herramienta profesional de dibujo digital con capas, pinceles avanzados, filtros y asistencia de inteligencia artificial.': 'Professional digital drawing tool with layers, advanced brushes, filters, and AI assistance.',
        'Nuevo Dibujo': 'New Drawing',
        'Comienza a crear desde cero': 'Start creating from scratch',
        'Explora y edita tus creaciones': 'Explore and edit your creations',
        'Crear Cuenta': 'Create Account',
        'Herramientas Profesionales': 'Professional Tools',
        'Todo lo que necesitas para crear arte digital de calidad profesional': 'Everything you need to create professional-quality digital art',
        'Sistema de Capas': 'Layer System',
        'Capas con opacidad, visibilidad, bloqueo y modos de fusión como Photoshop.': 'Layers with opacity, visibility, locking, and Photoshop-style blend modes.',
        'Pinceles Avanzados': 'Advanced Brushes',
        'Múltiples herramientas de pintura con control de tamaño, opacidad y flujo.': 'Multiple painting tools with size, opacity, and flow control.',
        'Asistente IA': 'AI Assistant',
        'IA': 'AI',
        'Genera imágenes con gpt-image-1 o recibe ideas creativas con GPT-4o.': 'Generate images with gpt-image-1 or get creative ideas with GPT-4o.',
        'Filtros': 'Filters',
        'Aplica filtros de grises, invertir, brillo y desenfoque con un clic.': 'Apply grayscale, invert, brightness, and blur filters with one click.',
        'Exportación Multi-formato': 'Multi-format Export',
        'Exporta en PNG, JPEG, WebP con control de calidad.': 'Export to PNG, JPEG, and WebP with quality control.',
        'Atajos de Teclado': 'Keyboard Shortcuts',
        'Atajos profesionales como Photoshop para flujo de trabajo rápido.': 'Professional Photoshop-style shortcuts for a fast workflow.',
        'Flujo de trabajo': 'Workflow',
        'Navegación como Photoshop': 'Photoshop-style Navigation',
        'Haz zoom con la rueda del ratón, navega manteniendo la barra espaciadora, usa atajos de teclado para cambiar herramientas al instante. Todo diseñado para un flujo de trabajo profesional.': 'Zoom with the mouse wheel, pan while holding Space, and use keyboard shortcuts to switch tools instantly. All designed for a professional workflow.',
        'Deshacer': 'Undo',
        'Tableta gráfica detectada': 'Graphics tablet detected',
        'Presión': 'Pressure',
        'Sensibilidad a la presión': 'Pressure sensitivity',
        'Presión activada': 'Pressure enabled',
        'Presión desactivada': 'Pressure disabled',
        'Eliminar dibujo': 'Delete drawing',
        '¿Eliminar este dibujo?': 'Delete this drawing?',
        'Dibujo eliminado': 'Drawing deleted',
        'Dibujo destruido': 'Drawing destroyed',
        'Esta acción no se puede deshacer.': 'This action cannot be undone.',
        '¿Seguro que quieres destruir este dibujo?': 'Are you sure you want to destroy this drawing?',
        'Destruir': 'Destroy',
        'Tamaño pincel': 'Brush size',
        'Herramientas': 'Tools',
        'Pinceles': 'Brushes',
        'Capas': 'Layers',
        'Colores': 'Colors',
        'Exportar': 'Export',
        'Herramienta de arte digital profesional.': 'Professional digital art tool.',

        'Bienvenido': 'Welcome',
        'Inicia sesión en SketchForge': 'Sign in to SketchForge',
        'Usuario o correo': 'Username or email',
        'Nombre de usuario o correo': 'Username or email',
        'Contraseña': 'Password',
        'Recordarme': 'Remember me',
        '¿Olvidaste tu contraseña?': 'Forgot your password?',
        '¿No tienes cuenta?': "Don't have an account?",
        'Regístrate': 'Sign up',
        'Únete a SketchForge': 'Join SketchForge',
        '¿Ya tienes cuenta?': 'Already have an account?',
        'Correo electrónico': 'Email address',
        'Nombre de usuario': 'Username',
        'Confirmar contraseña': 'Confirm password',
        'Repite la contraseña': 'Repeat password',
        'correo@ejemplo.com': 'email@example.com',
        'Tu nombre': 'Your first name',
        'Tu apellido': 'Your last name',
        'Este nombre de usuario ya está en uso.': 'This username is already in use.',
        'Este correo ya está registrado.': 'This email is already registered.',
        'Este campo es obligatorio.': 'This field is required.',
        'Este campo es requerido.': 'This field is required.',
        'Las dos contraseñas no coinciden.': 'The two passwords do not match.',
        'La confirmación de la contraseña no coincide.': 'The password confirmation does not match.',
        'La contraseña es demasiado corta.': 'The password is too short.',
        'La contraseña es demasiado común.': 'The password is too common.',
        'La contraseña es completamente numérica.': 'The password is entirely numeric.',
        'La contraseña no puede ser similar a otros datos.': 'The password is too similar to other data.',
        'Su contraseña debe contener al menos 8 caracteres.': 'Your password must contain at least 8 characters.',
        'Su contraseña no puede ser demasiado similar a su otra información personal.': "Your password can't be too similar to your other personal information.",
        'Su contraseña no puede contener solo números.': "Your password can't be entirely numeric.",
        'Su contraseña no puede ser una contraseña común.': "Your password can't be a commonly used password.",
        'Introduzca una contraseña.': 'Enter a password.',
        'Introduzca la misma contraseña para verificación.': 'Enter the same password for verification.',
        'Introduzca un nombre de usuario válido.': 'Enter a valid username.',
        'El nombre de usuario y/o la contraseña que especificaste no son correctos.': 'The username and/or password you specified are not correct.',
        'Introduzca un nombre de usuario y contraseña válidos.': 'Enter a valid username and password.',

        'Tus creaciones digitales': 'Your digital creations',
        'Sin dibujos aún': 'No drawings yet',
        'Comienza a crear tu primera obra de arte digital con nuestras herramientas profesionales.': 'Start creating your first digital artwork with our professional tools.',
        'Crear mi Primer Dibujo': 'Create My First Drawing',

        'Mi Perfil': 'My Profile',
        'dibujos': 'drawings',
        'Miembro desde': 'Member since',
        'Foto de Perfil': 'Profile Photo',
        'Arrastra una imagen o haz clic para cambiar': 'Drag an image or click to change',
        'PNG, JPG o WebP. Máximo 5MB.': 'PNG, JPG, or WebP. Max 5MB.',
        'Guardar Avatar': 'Save Avatar',
        'Información Personal': 'Personal Information',
        'Nombre': 'First name',
        'Apellido': 'Last name',
        'Guardar Información': 'Save Information',
        'Biografía y Redes': 'Bio & Social',
        'Biografía': 'Bio',
        'Cuéntanos sobre ti y tu estilo artístico.': 'Tell us about yourself and your artistic style.',
        'Sitio web': 'Website',
        'Ubicación': 'Location',
        'Contraseña actual': 'Current password',
        'Nueva contraseña': 'New password',
        'Confirmar nueva contraseña': 'Confirm new password',
        'Cambiar Contraseña': 'Change Password',
        'Zona de Peligro': 'Danger Zone',
        'Eliminar cuenta': 'Delete account',
        'Esta acción es irreversible. Se eliminarán todos tus dibujos, datos y configuración permanentemente.': 'This action is irreversible. All your drawings, data, and settings will be permanently deleted.',
        'Eliminar': 'Delete',
        'Eliminar Cuenta': 'Delete Account',
        'Escribe ELIMINAR para confirmar:': 'Type DELETE to confirm:',
        'Escribe ELIMINAR para confirmar': 'Type DELETE to confirm',
        'ELIMINAR': 'DELETE',
        'Cancelar': 'Cancel',
        'Esta acción es permanente y no se puede deshacer. Se borrarán todos tus dibujos y datos.': 'This action is permanent and cannot be undone. All your drawings and data will be deleted.',
        'Esta acción es': 'This action is',
        'permanente': 'permanent',
        'y no se puede deshacer. Se borrarán todos tus dibujos y datos.': 'and cannot be undone. All your drawings and data will be deleted.',
        'Escribe': 'Type',
        'para confirmar:': 'to confirm:',
        'Guardar Perfil': 'Save Profile',
        'Cuéntanos sobre ti y tu arte...': 'Tell us about yourself and your art...',
        'Ciudad, País': 'City, Country',
        '@usuario': '@username',
        'Debes escribir ELIMINAR para confirmar.': 'You must type DELETE to confirm.',
        'Perfil actualizado.': 'Profile updated.',
        'Avatar actualizado.': 'Avatar updated.',
        'Contraseña cambiada.': 'Password changed.',
        'Cuenta eliminada.': 'Account deleted.',
        'Datos de cuenta actualizados.': 'Account details updated.',
        '¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.': 'Account created successfully! You can now sign in.',

        'Archivo': 'File',
        'Edición': 'Edit',
        'Ver': 'View',
        'Capa': 'Layer',
        'Filtro': 'Filter',
        'Nuevo': 'New',
        'Guardar': 'Save',
        'Exportar PNG': 'Export PNG',
        'Exportar JPEG': 'Export JPEG',
        'Exportar WebP': 'Export WebP',
        'Guardar Miniatura': 'Save Thumbnail',
        'Rehacer': 'Redo',
        'Limpiar Capa': 'Clear Layer',
        'Acercar': 'Zoom In',
        'Alejar': 'Zoom Out',
        'Ajustar': 'Fit',
        'Nueva Capa': 'New Layer',
        'Eliminar Capa': 'Delete Layer',
        'Duplicar Capa': 'Duplicate Layer',
        'Escala de Grises': 'Grayscale',
        'Invertir Colores': 'Invert Colors',
        'Brillo +': 'Brightness +',
        'Desenfoque': 'Blur',
        'Título del dibujo': 'Drawing title',
        'Haz clic para cambiar el título': 'Click to change the title',
        'Tamaño': 'Size',
        'Opacidad': 'Opacity',
        'Flujo': 'Flow',
        'Pincel (B)': 'Brush (B)',
        'Borrador (E)': 'Eraser (E)',
        'Línea (L)': 'Line (L)',
        'Rectángulo (U)': 'Rectangle (U)',
        'Elipse (O)': 'Ellipse (O)',
        'Relleno (G)': 'Fill (G)',
        'Cuentagotas (I)': 'Eyedropper (I)',
        'Mano (H)': 'Hand (H)',
        'Zoom (Z)': 'Zoom (Z)',
        'Intercambiar colores': 'Swap colors',
        'Color de frente': 'Foreground color',
        'Color de fondo': 'Background color',
        'Deshacer (Ctrl+Z)': 'Undo (Ctrl+Z)',
        'Rehacer (Ctrl+Shift+Z)': 'Redo (Ctrl+Shift+Z)',
        'Opciones': 'Options',
        'Visibilidad': 'Visibility',
        'Bloquear': 'Lock',
        'Mover Arriba': 'Move Up',
        'Mover Abajo': 'Move Down',
        'Color': 'Color',
        'HEX': 'HEX',
        'Describe lo que quieres generar...': 'Describe what you want to generate...',
        'Generar con IA': 'Generate with AI',
        'Miniatura': 'Thumbnail',
        'Acciones': 'Actions',
        'Guardar Dibujo': 'Save Drawing',
        'Atajos': 'Shortcuts',
        'Pincel': 'Brush',
        'Borrador': 'Eraser',
        'Línea': 'Line',
        'Rectángulo': 'Rectangle',
        'Elipse': 'Ellipse',
        'Relleno': 'Fill',
        'Cuentagotas': 'Eyedropper',
        'Mano': 'Hand',
        'Normal': 'Normal',
        'Multiplicar': 'Multiply',
        'Trama': 'Screen',
        'Superponer': 'Overlay',
        'Oscurecer': 'Darken',
        'Aclarar': 'Lighten',
        'Sobreexponer color': 'Color Dodge',
        'Subexponer color': 'Color Burn',
        'Luz intensa': 'Hard Light',
        'Luz suave': 'Soft Light',
        'Diferencia': 'Difference',
        'Exclusión': 'Exclusion',
        'Tono': 'Hue',
        'Saturación': 'Saturation',
        'Luminosidad': 'Luminosity',
        'Arte Digital': 'Digital Art',
        'Boceto': 'Sketch',
        'Acuarela': 'Watercolor',
        'Pintura al Óleo': 'Oil Painting',
        'Pixel Art': 'Pixel Art',
        'Render 3D': '3D Render',
        'Diseño Flat': 'Flat Design',
        'Sin título': 'Untitled',

        'Filtro aplicado': 'Filter applied',
        'Miniatura guardada': 'Thumbnail saved',
        'Error al guardar miniatura': 'Error saving thumbnail',
        'Error al exportar': 'Error exporting',
        'Dibujo guardado correctamente': 'Drawing saved successfully',
        'Dibujo guardado': 'Drawing saved',
        'Error al guardar': 'Error saving',
        'Capa limpiada': 'Layer cleared',
        'Nueva capa creada': 'New layer created',
        'copia': 'copy',
        'Capa duplicada': 'Layer duplicated',
        'No se puede eliminar la última capa': 'Cannot delete the last layer',
        'Capa eliminada': 'Layer deleted',
        'Crear un nuevo dibujo? Los cambios no guardados se perderán.': 'Create a new drawing? Unsaved changes will be lost.',
        'Escribe una descripción': 'Write a description',
        'Generando...': 'Generating...',
        'Generando imagen...': 'Generating image...',
        'Usar en Lienzo': 'Use on Canvas',
        'Imagen aplicada al lienzo': 'Image applied to canvas',
        'Obtener ideas con GPT-4o': 'Get ideas with GPT-4o',
        'Abrir facturación de OpenAI': 'Open OpenAI billing',
        'Consultando a GPT-4o...': 'Consulting GPT-4o...',
        'Ideas creativas:': 'Creative ideas:',
        'Error de conexión': 'Connection error',
        'No hay datos de imagen': 'No image data',
        'Se requiere un prompt': 'A prompt is required',
        'Modo demostración - No hay API key configurada': 'Demo mode - No API key configured',
        'Configura OPENAI_API_KEY en .env para usar la generación por IA': 'Set OPENAI_API_KEY in .env to use AI generation',
        'Tu cuenta de OpenAI no tiene créditos disponibles.': 'Your OpenAI account has no available credits.',
        'Añade créditos en platform.openai.com/settings/organization/billing y vuelve a intentarlo.': 'Add credits at platform.openai.com/settings/organization/billing and try again.',
        'OpenAI está limitando las solicitudes. Espera un momento e inténtalo de nuevo.': 'OpenAI is rate limiting requests. Wait a moment and try again.',
        'No se pudo generar la imagen con gpt-image-1.': 'Could not generate the image with gpt-image-1.',
        'No hay API key configurada': 'No API key configured',

        'Éxito': 'Success',
        'Atención': 'Warning',
        'Información': 'Information'
    };

    const patterns = [
        [/^Capa (\d+) copia$/, 'Layer $1 copy'],
        [/^Capa (\d+)$/, 'Layer $1'],
        [/^Opacidad: (\d+)%$/, 'Opacity: $1%'],
        [/^Color seleccionado: (.+)$/, 'Color selected: $1'],
        [/^Filtro aplicado: (.+)$/, 'Filter applied: $1'],
        [/^Dibujo exportado como (.+)$/, 'Drawing exported as $1'],
        [/^Exportado como (.+)$/, 'Exported as $1'],
        [/^Miembro desde (\S+)\.? (\d{4})$/i, (full, month, year) => {
            const key = month.replace(/\.$/, '').toLowerCase();
            return `Member since ${MONTHS[key] || month} ${year}`;
        }],
        [/^Error: (.+)$/, 'Error: $1'],
        [/^© (\d{4}) SketchForge\. Herramienta de arte digital profesional\.$/, '© $1 SketchForge. Professional digital art tool.'],
        [/^SketchForge - Editor de Arte Digital$/, 'SketchForge - Digital Art Editor'],
        [/^SketchForge - Galería - SketchForge$/, 'SketchForge - Gallery - SketchForge'],
        [/^SketchForge - Mi Perfil - SketchForge$/, 'SketchForge - My Profile - SketchForge'],
        [/^SketchForge - Iniciar Sesión - SketchForge$/, 'SketchForge - Log In - SketchForge'],
        [/^SketchForge - Registro - SketchForge$/, 'SketchForge - Sign Up - SketchForge'],
        [/^SketchForge - (.+) - SketchForge$/, (full, base) => (base === 'Sin título' ? 'SketchForge - Untitled - SketchForge' : full)],
        [/^(.+) - SketchForge$/, (full, base) => (base === 'Sin título' ? 'Untitled - SketchForge' : full)]
    ];

    const textOriginals = new WeakMap();
    const textLast = new WeakMap();
    const attrOriginals = new WeakMap();
    const ATTRS = ['placeholder', 'title', 'aria-label'];

    let currentLang = detectLanguage();
    let observer = null;
    let translating = false;

    function detectLanguage() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && SUPPORTED.includes(stored)) {
            return stored;
        }
        return DEFAULT_LANG;
    }

    function normalize(value) {
        return value.replace(/\s+/g, ' ').trim();
    }

    function translateString(value) {
        if (currentLang === 'es' || !value) {
            return value;
        }

        const leading = value.match(/^\s*/)[0];
        const trailing = value.match(/\s*$/)[0];
        const core = normalize(value);
        if (!core) {
            return value;
        }

        let translated = dictionary[core];
        if (translated === undefined) {
            for (const [pattern, replacement] of patterns) {
                if (pattern.test(core)) {
                    translated = core.replace(pattern, replacement);
                    break;
                }
            }
        }

        if (translated === undefined) {
            return value;
        }
        return leading + translated + trailing;
    }

    function translateTextNode(node) {
        const current = node.nodeValue;
        let original = textOriginals.get(node);
        const last = textLast.get(node);

        if (original === undefined || (last !== undefined && current !== last)) {
            original = current;
            textOriginals.set(node, original);
        }

        const translated = translateString(original);
        if (current !== translated) {
            node.nodeValue = translated;
        }
        textLast.set(node, translated);
    }

    function translateAttributes(element) {
        for (const attr of ATTRS) {
            if (!element.hasAttribute(attr)) {
                continue;
            }

            const current = element.getAttribute(attr);
            let store = attrOriginals.get(element);
            if (!store) {
                store = new Map();
                attrOriginals.set(element, store);
            }

            let entry = store.get(attr);
            if (!entry || (entry.last !== undefined && current !== entry.last)) {
                entry = { original: current };
                store.set(attr, entry);
            }

            const translated = translateString(entry.original);
            if (current !== translated) {
                element.setAttribute(attr, translated);
            }
            entry.last = translated;
        }
    }

    function isSkipped(node) {
        const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        if (!el) {
            return false;
        }
        if (el.closest && el.closest('[data-no-i18n]')) {
            return true;
        }
        if (node.nodeType === Node.TEXT_NODE) {
            return ['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE'].includes(el.tagName);
        }
        return ['SCRIPT', 'STYLE'].includes(el.tagName);
    }

    function translateNode(node) {
        if (!node || isSkipped(node)) {
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node);
            return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        translateAttributes(node);

        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
            acceptNode(child) {
                return isSkipped(child) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
            }
        });

        let child = walker.nextNode();
        while (child) {
            if (child.nodeType === Node.TEXT_NODE) {
                translateTextNode(child);
            } else {
                translateAttributes(child);
            }
            child = walker.nextNode();
        }
    }

    function translateDocument() {
        translating = true;
        translateNode(document.documentElement);
        translating = false;
    }

    function startObserver() {
        if (observer || currentLang === 'es') {
            return;
        }

        observer = new MutationObserver((mutations) => {
            if (translating) {
                return;
            }
            translating = true;
            for (const mutation of mutations) {
                if (mutation.type === 'characterData') {
                    if (!isSkipped(mutation.target)) {
                        translateTextNode(mutation.target);
                    }
                } else if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => translateNode(node));
                } else if (mutation.type === 'attributes') {
                    translateAttributes(mutation.target);
                }
            }
            translating = false;
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ATTRS
        });
    }

    function stopObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    function updateSelector() {
        const flags = { es: 'fi-co', en: 'fi-us' };
        const codes = { es: 'ES', en: 'EN' };

        const flag = document.getElementById('languageFlag');
        if (flag) {
            flag.className = `fi ${flags[currentLang] || flags[DEFAULT_LANG]}`;
        }

        const code = document.getElementById('languageCode');
        if (code) {
            code.textContent = codes[currentLang] || codes[DEFAULT_LANG];
        }

        document.querySelectorAll('.lang-option').forEach((option) => {
            const active = option.dataset.lang === currentLang;
            option.classList.toggle('active', active);
            option.setAttribute('aria-pressed', active ? 'true' : 'false');
        });

        const select = document.getElementById('languageSelect');
        if (select) {
            select.value = currentLang;
        }
    }

    function setLanguage(lang, persist) {
        currentLang = SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;
        if (persist) {
            localStorage.setItem(STORAGE_KEY, currentLang);
        }

        document.documentElement.lang = currentLang;
        document.documentElement.setAttribute('data-lang', currentLang);

        stopObserver();
        translateDocument();
        updateSelector();
        startObserver();
    }

    window.SFI18N = {
        t: translateString,
        getLang: () => currentLang,
        setLang: (lang) => setLanguage(lang, true)
    };

    document.addEventListener('DOMContentLoaded', function() {
        setLanguage(currentLang, false);

        const select = document.getElementById('languageSelect');
        if (select) {
            select.addEventListener('change', function() {
                setLanguage(this.value, true);
            });
        }

        document.querySelectorAll('.lang-option').forEach((option) => {
            option.addEventListener('click', function() {
                setLanguage(this.dataset.lang, true);
            });
        });
    });
})();
