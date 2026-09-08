# 🎨 SketchForge — Proyecto_Nia

**SketchForge** es una aplicación web de dibujo digital (editor de canvas) con autenticación de usuarios, galería de obras, modos oscuro/claro, capas y herramientas de IA para generar imágenes. Desarrollada con **Django**.

---

## ✨ Características

- 🖌️ **Editor de dibujo** en lienzo con pinceles, colores y capas
- 👤 **Autenticación de usuarios** con `django-allauth` (registro, login, perfil)
- 🖼️ **Galería** de obras guardadas por cada usuario
- 🤖 **Generación de imágenes con IA** (OpenAI)
- 🌙 **Modo oscuro / claro**
- 📤 **Exportación** de dibujos en varios formatos
- 📁 **Gestión de capas** en tiempo real

---

## 🛠️ Tecnologías

- **Backend:** Django 4.2
- **Autenticación:** django-allauth
- **Base de datos:** SQLite
- **IA:** OpenAI API
- **CORS:** django-cors-headers
- **Imágenes:** Pillow
- **Frontend:** HTML, CSS, JavaScript (canvas nativo)

---

## 📋 Requisitos previos

- Python 3.10+
- pip

---

## 🚀 Instalación

```bash
# 1. Clona el repositorio
git clone https://github.com/alexperezalvarez/Proyecto_Nia.git
cd Proyecto_Nia

# 2. Crea y activa un entorno virtual
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / macOS

# 3. Instala las dependencias
py -m pip install -r requirements.txt

# 4. Configura las variables de entorno (.env)
#    - DJANGO_SECRET_KEY
#    - DJANGO_DEBUG
#    - DJANGO_ALLOWED_HOSTS
#    - OPENAI_API_KEY

# 5. Realiza las migraciones
py manage.py migrate

# 6. Crea un superusuario
py manage.py createsuperuser

# 7. Inicia el servidor
py manage.py runserver
```

Abre **http://127.0.0.1:8000** en tu navegador 🎉

---

## 🗂️ Estructura del proyecto

```
Proyecto_Nia/
├── SketchForge/          # Configuración principal del proyecto
│   ├── settings.py
│   ├── urls.py
│   └── ...
├── accounts/             # Módulo de autenticación y perfiles
├── canvas/               # Módulo del editor y galería
├── static/               # CSS y JavaScript
│   ├── css/
│   └── js/
├── templates/            # Plantillas base (HTML)
├── manage.py
└── requirements.txt
```

---

## 🧑‍💻 Uso

1. Regístrate o inicia sesión.
2. Accede al **editor** y dibuja con tus herramientas.
3. Guarda tus obras en la **galería**.
4. Explora el modo oscuro y las herramientas de IA.

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**.

Hecho con 💙 por **Alexander Pérez**.
