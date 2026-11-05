import json
import base64
import uuid
import requests
import time
import os
import urllib.parse
from io import BytesIO
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.contrib import messages
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db.models import Max
from .models import Drawing, Layer
from .forms import DrawingForm
try:
    import replicate
except Exception:
    replicate = None

@login_required
def editor(request, drawing_id=None):
    if drawing_id:
        drawing = get_object_or_404(Drawing, id=drawing_id, user=request.user)
    else:
        drawing = Drawing.objects.create(user=request.user)
        Layer.objects.create(drawing=drawing, name='Capa 1', order=0)
    layers = drawing.layers.all()
    form = DrawingForm(instance=drawing)
    return render(request, 'canvas/editor.html', {
        'drawing': drawing,
        'layers': layers,
        'form': form,
    })

@login_required
def gallery(request):
    drawings = Drawing.objects.filter(user=request.user)
    return render(request, 'canvas/gallery.html', {'drawings': drawings})

@login_required
def new_drawing(request):
    if request.method == 'POST':
        form = DrawingForm(request.POST)
        if form.is_valid():
            drawing = form.save(commit=False)
            drawing.user = request.user
            drawing.save()
            Layer.objects.create(drawing=drawing, name='Capa 1', order=0)
            return redirect('canvas:editor', drawing_id=drawing.id)
    return redirect('canvas:gallery')

@login_required
@require_POST
def save_drawing(request, drawing_id):
    drawing = get_object_or_404(Drawing, id=drawing_id, user=request.user)
    data = json.loads(request.body)

    drawing.title = data.get('title', drawing.title)
    drawing.save()

    return JsonResponse({'status': 'ok', 'message': 'Dibujo guardado'})

@login_required
@require_POST
def save_layer(request, drawing_id):
    drawing = get_object_or_404(Drawing, id=drawing_id, user=request.user)
    data = json.loads(request.body)

    layer_id = data.get('layer_id')
    layer_data = data.get('data', {})
    layer_name = data.get('name', 'Capa')
    layer_opacity = data.get('opacity', 1.0)
    layer_visible = data.get('visible', True)
    title = str(data.get('title', '')).strip()

    if title:
        drawing.title = title[:200]
        drawing.save()

    if layer_id:
        layer = get_object_or_404(Layer, id=layer_id, drawing=drawing)
    else:
        layer = drawing.layers.order_by('order', 'id').first()
        if layer is None:
            layer = Layer(drawing=drawing)
            layer.order = (drawing.layers.aggregate(Max('order'))['order__max'] or 0) + 1

    layer.name = layer_name
    layer.opacity = layer_opacity
    layer.visible = layer_visible
    layer.data = layer_data
    layer.save()

    return JsonResponse({
        'status': 'ok',
        'layer_id': layer.id,
        'title': drawing.title,
    })

@login_required
@require_POST
def delete_layer(request, drawing_id, layer_id):
    drawing = get_object_or_404(Drawing, id=drawing_id, user=request.user)
    layer = get_object_or_404(Layer, id=layer_id, drawing=drawing)
    layer.delete()
    return JsonResponse({'status': 'ok'})

@login_required
@require_POST
def delete_drawing(request, drawing_id):
    drawing = get_object_or_404(Drawing, id=drawing_id, user=request.user)
    if drawing.thumbnail:
        drawing.thumbnail.delete(save=False)
    drawing.delete()
    messages.success(request, 'Dibujo destruido')
    return redirect('canvas:gallery')

@login_required
@require_POST
def upload_thumbnail(request, drawing_id):
    drawing = get_object_or_404(Drawing, id=drawing_id, user=request.user)
    data = json.loads(request.body)
    image_data = data.get('image', '')

    if image_data:
        format, imgstr = image_data.split(';base64,')
        ext = format.split('/')[-1]
        drawing.thumbnail.save(
            f'thumb_{drawing.id}.{ext}',
            ContentFile(base64.b64decode(imgstr)),
            save=True
        )

    return JsonResponse({'status': 'ok'})

@login_required
@require_POST
def export_drawing(request, drawing_id):
    drawing = get_object_or_404(Drawing, id=drawing_id, user=request.user)
    data = json.loads(request.body)
    image_data = data.get('image', '')
    format_type = data.get('format', 'png')

    if image_data:
        format, imgstr = image_data.split(';base64,')
        ext = format.split('/')[-1]
        drawing.thumbnail.save(
            f'export_{drawing.id}.{ext}',
            ContentFile(base64.b64decode(imgstr)),
            save=True
        )
        return JsonResponse({
            'status': 'ok',
            'url': drawing.thumbnail.url,
            'message': f'Dibujo exportado como {format_type.upper()}'
        })

    return JsonResponse({'status': 'error', 'message': 'No hay datos de imagen'})

def _save_generated_image(request, image_bytes, user_id, ext='png'):
    pathname = f"ai/{user_id}/{uuid.uuid4().hex}.{ext}"
    try:
        saved_name = default_storage.save(pathname, ContentFile(image_bytes))
        return request.build_absolute_uri(default_storage.url(saved_name))
    except Exception:
        return None


def _image_ext(image_bytes, content_type=''):
    if image_bytes[:8] == b'\x89PNG\r\n\x1a\n':
        return 'png'
    if image_bytes[:3] == b'\xff\xd8\xff' or 'jpeg' in content_type:
        return 'jpg'
    if image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP':
        return 'webp'
    return 'png'


STYLE_PROMPTS = {
    'digital-art': 'digital painting artwork, detailed digital illustration, vibrant colors, dramatic lighting, not a photograph',
    'sketch': 'black and white pencil sketch on paper, graphite line drawing, visible pencil strokes, rough hatching, hand-drawn, monochrome, no color, not a photograph',
    'watercolor': 'watercolor painting on textured paper, translucent watercolor washes, soft blended edges, wet-on-wet, visible brush strokes, not a photograph',
    'oil-painting': 'oil painting on canvas, thick impasto brush strokes, rich saturated colors, classical fine art painting, not a photograph',
    'anime': 'anime illustration, cel shaded, bold clean black outlines, flat vibrant colors, japanese animation art style, not a photograph',
    'pixel-art': 'pixel art sprite, 16-bit retro video game graphics, large visible square pixels, limited color palette, sharp pixel edges, not a photograph',
    '3d-render': '3D CGI render, smooth shaded 3D model, realistic global illumination, soft shadows, octane render, studio lighting',
    'flat-design': 'flat vector illustration, minimalist flat design, solid flat colors, simple geometric shapes, no gradients, no shadows, not a photograph',
}


def _apply_style(prompt, style):
    suffix = STYLE_PROMPTS.get((style or '').strip().lower())
    if suffix:
        return f"{suffix}. Subject: {prompt}"
    return prompt


def _pollinations_generate(request, prompt, image_b64=None, style=None):
    if not prompt:
        return JsonResponse({'status': 'error', 'message': 'Pollinations requiere una descripción de texto'})

    prompt = _apply_style(prompt, style)

    token = getattr(settings, 'POLLINATIONS_TOKEN', '') or os.environ.get('POLLINATIONS_TOKEN', '')
    base = getattr(settings, 'POLLINATIONS_API_URL', '') or os.environ.get('POLLINATIONS_API_URL', 'https://gen.pollinations.ai')
    classic = getattr(settings, 'POLLINATIONS_CLASSIC_URL', '') or os.environ.get('POLLINATIONS_CLASSIC_URL', 'https://image.pollinations.ai/prompt')
    model = getattr(settings, 'POLLINATIONS_MODEL', '') or os.environ.get('POLLINATIONS_MODEL', 'flux')
    width = getattr(settings, 'POLLINATIONS_WIDTH', 1024)
    height = getattr(settings, 'POLLINATIONS_HEIGHT', 1024)

    headers = {
        'User-Agent': 'SketchForge/1.0',
        'Referer': 'https://sketchforge.art/',
    }

    try:
        if token:
            url = f"{base.rstrip('/')}/v1/images/generations"
            headers['Authorization'] = f'Bearer {token}'
            payload = {
                'prompt': prompt,
                'model': model,
                'size': f'{width}x{height}',
                'n': 1,
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=180)
            if resp.status_code == 401:
                return JsonResponse({'status': 'error', 'message': 'La API key de Pollinations es inválida o fue revocada'})
            if resp.status_code == 402:
                return JsonResponse({'status': 'rate_limit', 'message': 'Saldo de Pollen agotado en Pollinations. Recarga en enter.pollinations.ai'})
            if resp.status_code == 429:
                return JsonResponse({'status': 'rate_limit', 'message': 'Pollinations está limitando las solicitudes. Espera unos segundos e inténtalo de nuevo.'})
            resp.raise_for_status()

            data = resp.json()
            item = (data.get('data') or [{}])[0] if isinstance(data, dict) else {}
            if item.get('url'):
                return JsonResponse({'status': 'ok', 'image_url': item['url'], 'provider': 'pollinations'})
            if item.get('b64_json'):
                image_bytes = base64.b64decode(item['b64_json'])
                ext = _image_ext(image_bytes, 'image/jpeg')
                image_url = _save_generated_image(request, image_bytes, request.user.id, ext=ext)
                if not image_url:
                    image_url = f'data:image/{ext};base64,{item["b64_json"]}'
                return JsonResponse({'status': 'ok', 'image_url': image_url, 'provider': 'pollinations'})
            return JsonResponse({'status': 'error', 'message': 'Respuesta inesperada de Pollinations', 'detail': str(data)[:300]})

        url = f"{classic.rstrip('/')}/{urllib.parse.quote(prompt)}"
        params = {
            'width': width,
            'height': height,
            'nologo': 'true',
            'model': model,
            'seed': int(time.time() * 1000) % 2147483647,
        }
        resp = None
        for attempt in range(3):
            resp = requests.get(url, params=params, headers=headers, timeout=180)
            if resp.status_code == 402:
                return JsonResponse({
                    'status': 'rate_limit',
                    'message': 'Límite gratuito de Pollinations alcanzado (1 imagen cada 45 s). Espera un momento e inténtalo de nuevo.',
                })
            if resp.status_code == 429:
                return JsonResponse({
                    'status': 'rate_limit',
                    'message': 'Pollinations está limitando las solicitudes. Espera unos segundos e inténtalo de nuevo.',
                })
            if resp.status_code < 500:
                break
            time.sleep(2)

        resp.raise_for_status()
        ctype = resp.headers.get('content-type', '')
        if 'image' not in ctype:
            return JsonResponse({
                'status': 'error',
                'message': 'Pollinations no devolvió una imagen',
                'detail': resp.text[:300],
            })

        image_bytes = resp.content
        ext = _image_ext(image_bytes, ctype)
        image_url = _save_generated_image(request, image_bytes, request.user.id, ext=ext)
        if not image_url:
            b64 = base64.b64encode(image_bytes).decode('utf-8')
            image_url = f'data:{ctype};base64,{b64}'
        return JsonResponse({'status': 'ok', 'image_url': image_url, 'provider': 'pollinations'})
    except requests.exceptions.RequestException as e:
        return JsonResponse({
            'status': 'error',
            'message': 'Error al generar con Pollinations',
            'detail': str(e),
        })


@login_required
@require_POST
def ai_generate(request):
    import openai
    data = json.loads(request.body)
    prompt = data.get('prompt', '')
    style = data.get('style', 'digital-art')

    if not prompt:
        return JsonResponse({'status': 'error', 'message': 'Se requiere un prompt'})

    api_key = getattr(settings, 'OPENAI_API_KEY', '')
    if not api_key:
        return _pollinations_generate(request, prompt, style=style)

    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.images.generate(
            model="gpt-image-1",
            prompt=_apply_style(prompt, style),
            size="1024x1024",
            quality="medium",
            n=1,
        )
        image = response.data[0]
        if getattr(image, 'b64_json', None):
            image_bytes = base64.b64decode(image.b64_json)
            image_url = _save_generated_image(request, image_bytes, request.user.id)
            if not image_url:
                image_url = f"data:image/png;base64,{image.b64_json}"
        else:
            image_url = image.url
        return JsonResponse({'status': 'ok', 'image_url': image_url})
    except openai.RateLimitError as e:
        detail = str(e)
        low = detail.lower()
        if 'credit' in low or 'quota' in low or 'billing' in low:
            return JsonResponse({
                'status': 'no_credits',
                'message': 'Tu cuenta de OpenAI no tiene créditos disponibles.',
                'hint': 'Añade créditos en platform.openai.com/settings/organization/billing y vuelve a intentarlo.',
                'detail': detail,
            })
        return JsonResponse({
            'status': 'rate_limit',
            'message': 'OpenAI está limitando las solicitudes. Espera un momento e inténtalo de nuevo.',
            'detail': detail,
        })
    except openai.APIError as e:
        return JsonResponse({
            'status': 'no_access',
            'message': 'No se pudo generar la imagen con gpt-image-1.',
            'hint': str(e),
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})

@login_required
@require_POST
def ai_ideas(request):
    data = json.loads(request.body)
    prompt = data.get('prompt', '')
    style = data.get('style', 'digital-art')
    lang = data.get('lang', 'es')
    english = lang == 'en'

    if not prompt:
        message = 'A prompt is required' if english else 'Se requiere un prompt'
        return JsonResponse({'status': 'error', 'message': message})

    api_key = getattr(settings, 'OPENAI_API_KEY', '')
    if not api_key:
        message = 'No API key configured' if english else 'No hay API key configurada'
        return JsonResponse({'status': 'error', 'message': message})

    import openai
    try:
        client = openai.OpenAI(api_key=api_key)
        if english:
            system_prompt = (
                "You are an expert digital art and graphic design assistant. "
                "Respond in English. Generate creative ideas and practical tips to help "
                "the user draw what they describe. Be specific and helpful."
            )
            user_prompt = (
                f"I want to draw: {prompt}. Style: {style}. Give me creative ideas, "
                "composition tips, a suggested color palette, and techniques I could use."
            )
        else:
            system_prompt = (
                "Eres un asistente experto en arte digital y diseño gráfico. "
                "Responde en español. Genera ideas creativas y consejos prácticos para "
                "ayudar al usuario a dibujar lo que describe. Sé específico y útil."
            )
            user_prompt = (
                f"Quiero dibujar: {prompt}. Estilo: {style}. Dame ideas creativas, "
                "consejos de composición, paleta de colores sugerida y técnicas que podría usar."
            )

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=500,
        )
        ideas = response.choices[0].message.content
        return JsonResponse({'status': 'ok', 'ideas': ideas})
    except openai.RateLimitError:
        if english:
            ideas = (
                '💡 **Ideas for your drawing:**\n\n'
                '• **Composition**: Try the rule of thirds to balance the elements.\n'
                '• **Color palette**: Use complementary tones to create contrast.\n'
                '• **Technique**: Start with light sketches and add details gradually.\n'
                '• **Inspiration**: Look for visual references on Pinterest or Google Images.\n\n'
                '⚠️ The OpenAI API has no available credits. The ideas above are general suggestions.'
            )
        else:
            ideas = (
                '💡 **Ideas para tu dibujo:**\n\n'
                '• **Composición**: Prueba con la regla de los tercios para equilibrar los elementos.\n'
                '• **Paleta de colores**: Usa tonos complementarios para dar contraste.\n'
                '• **Técnica**: Empieza con bocetos ligeros y ve añadiendo detalles progresivamente.\n'
                '• **Inspiración**: Busca referencias visuales en Pinterest o Google Images.\n\n'
                '⚠️ La API de OpenAI no tiene créditos disponibles. Las ideas de arriba son sugerencias generales.'
            )
        return JsonResponse({'status': 'ok', 'ideas': ideas})
    except Exception as e:
        if english:
            ideas = (
                '💡 **Drawing suggestions:**\n\n'
                '• Define the basic shapes first (circles, rectangles) before adding detail.\n'
                '• Work from general to specific: background, then main objects, then details.\n'
                '• Use separate layers for each element so you can adjust them independently.\n'
                '• Experiment with different brush sizes to add depth.\n\n'
                f'💬 {prompt} - {style}. Trust your creativity and keep practicing!'
            )
        else:
            ideas = (
                '💡 **Sugerencias para dibujar:**\n\n'
                '• Define primero las formas básicas (círculos, rectángulos) antes de detallar.\n'
                '• Trabaja de lo general a lo particular: fondo, luego objetos principales, después detalles.\n'
                '• Usa capas separadas para cada elemento, así puedes ajustarlos sin afectar el resto.\n'
                '• Experimenta con diferentes grosores de pincel para dar profundidad.\n\n'
                f'💬 {prompt} - {style}. ¡Confía en tu creatividad y practica!'
            )
        return JsonResponse({'status': 'ok', 'ideas': ideas})


@login_required
@require_POST
def ai_nano_generate(request):
    data = json.loads(request.body)
    prompt = data.get('prompt', '')
    image_b64 = data.get('image') or data.get('image_base64')
    style = data.get('style', '')

    if not prompt and not image_b64:
        return JsonResponse({'status': 'error', 'message': 'Se requiere un prompt o una imagen'})

    hf_key = getattr(settings, 'HUGGINGFACE_API_TOKEN', '') or os.environ.get('HUGGINGFACE_API_TOKEN', '')
    repl_key = getattr(settings, 'REPLICATE_API_TOKEN', '') or os.environ.get('REPLICATE_API_TOKEN', '')
    fal_key = getattr(settings, 'FAL_KEY', '') or getattr(settings, 'NANOBANANA_API_KEY', '') or os.environ.get('FAL_KEY', '')
    provider = (os.environ.get('IMAGE_PROVIDER') or getattr(settings, 'IMAGE_PROVIDER', '') or '').strip().lower()

    if provider == 'pollinations' or (prompt and not (hf_key or repl_key or fal_key)):
        return _pollinations_generate(request, prompt, image_b64, style=style)

    if hf_key and prompt:
        try:
            hf_model = getattr(settings, 'HF_MODEL', '') or os.environ.get('HF_MODEL', 'ByteDance/SDXL-Lightning')
            headers = {'Authorization': f'Bearer {hf_key}'}
            payload = {'inputs': prompt}
            resp = None
            bases = [
                'https://router.huggingface.co/hf-inference/models',
            ]
            for base in bases:
                try:
                    api_url = f'{base}/{hf_model}'
                    resp = requests.post(api_url, headers=headers, json=payload, timeout=300)
                    if resp is not None:
                        break
                except Exception:
                    resp = None
                    continue
            if resp is None:
                raise Exception('No HF endpoint reachable')
            if resp.status_code == 503:
                try:
                    info = resp.json()
                    return JsonResponse({'status': 'error', 'message': 'Modelo cargándose en HuggingFace, reintenta en 30-60 segundos', 'detail': info})
                except Exception:
                    return JsonResponse({'status': 'error', 'message': 'Modelo cargándose en HuggingFace, reintenta en 30-60 segundos'})
            resp.raise_for_status()
            ctype = resp.headers.get('content-type', '')
            if 'image' in ctype:
                image_bytes = resp.content
                image_url = _save_generated_image(request, image_bytes, request.user.id)
                if not image_url:
                    b64 = base64.b64encode(image_bytes).decode('utf-8')
                    image_url = f'data:{ctype};base64,{b64}'
                return JsonResponse({'status': 'ok', 'image_url': image_url})
            try:
                res = resp.json()
                if isinstance(res, list) and res and isinstance(res[0], dict) and res[0].get('url'):
                    return JsonResponse({'status': 'ok', 'image_url': res[0]['url']})
                if isinstance(res, dict) and res.get('generated_images'):
                    g = res['generated_images'][0]
                    if isinstance(g, dict) and g.get('url'):
                        return JsonResponse({'status': 'ok', 'image_url': g['url']})
            except Exception:
                pass
            b64 = base64.b64encode(resp.content).decode('utf-8')
            image_url = f'data:image/png;base64,{b64}'
            return JsonResponse({'status': 'ok', 'image_url': image_url})
        except requests.exceptions.HTTPError as e:
            try:
                return JsonResponse({'status': 'error', 'message': f'Error HTTP HuggingFace: {e}', 'detail': resp.text if 'resp' in locals() and resp else str(e)})
            except Exception:
                return JsonResponse({'status': 'error', 'message': f'Error HTTP HuggingFace: {e}'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': f'Error HuggingFace', 'detail': str(e)})

    repl_key = getattr(settings, 'REPLICATE_API_TOKEN', '') or os.environ.get('REPLICATE_API_TOKEN', '')
    if repl_key and replicate is not None and prompt:
        try:
            os.environ['REPLICATE_API_TOKEN'] = repl_key
            client = replicate.Client(api_token=repl_key)
            input_data = {'prompt': prompt}
            if image_b64:
                clean_b64 = image_b64
                if isinstance(image_b64, str) and image_b64.startswith('data:'):
                    clean_b64 = image_b64.split(',', 1)[1]
                input_data['image_input'] = f'data:image/png;base64,{clean_b64}'
            model = os.environ.get('REPLICATE_MODEL', 'google/nano-banana')
            output = client.run(model, input=input_data)
            image_url = None
            if isinstance(output, list) and output:
                o = output[0]
                if isinstance(o, str):
                    image_url = o
                elif isinstance(o, dict):
                    image_url = o.get('url')
            elif isinstance(output, str):
                image_url = output
            elif isinstance(output, dict):
                image_url = output.get('url')
            if not image_url:
                return JsonResponse({'status': 'error', 'message': 'Respuesta inesperada de Replicate', 'raw': output})
            return JsonResponse({'status': 'ok', 'image_url': image_url})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': f'Error con Replicate', 'detail': str(e)})

    api_key = getattr(settings, 'FAL_KEY', '') or getattr(settings, 'NANOBANANA_API_KEY', '') or os.environ.get('FAL_KEY', '') or os.environ.get('NANOBANANA_API_KEY', '')
    if not api_key:
        return JsonResponse({
            'status': 'error',
            'message': 'No hay API configurada',
            'hint': 'Añade HUGGINGFACE_API_TOKEN a tu .env'
        })

    api_url = getattr(settings, 'NANOBANANA_API_URL', '') or os.environ.get('NANOBANANA_API_URL', 'https://queue.fal.run/fal-ai/nano-banana')

    try:
        headers = {
            'Authorization': f'Key {api_key}',
            'Content-Type': 'application/json',
        }

        payload = {
            'prompt': prompt,
        }

        if image_b64:
            clean_b64 = image_b64
            if isinstance(image_b64, str) and image_b64.startswith('data:'):
                try:
                    clean_b64 = image_b64.split(',', 1)[1]
                except Exception:
                    pass
            payload['image_url'] = f'data:image/png;base64,{clean_b64}' if not str(image_b64).startswith('http') else image_b64

        try:
            resp = requests.post(api_url, json=payload, headers=headers, timeout=300)
            resp.raise_for_status()
            res = resp.json()
        except requests.exceptions.RequestException as e:
            try:
                err_detail = resp.text if 'resp' in locals() else str(e)
            except Exception:
                err_detail = str(e)
            return JsonResponse({'status': 'error', 'message': f'Fallo de conexión con NanoBanana', 'detail': err_detail, 'url': api_url})

        image_url = None
        if isinstance(res, dict):
            if res.get('images') and isinstance(res['images'], list) and res['images']:
                img = res['images'][0]
                if isinstance(img, dict):
                    image_url = img.get('url')
                elif isinstance(img, str):
                    image_url = img
            if not image_url and res.get('image') and isinstance(res['image'], dict):
                image_url = res['image'].get('url')
            if not image_url and res.get('output') and isinstance(res['output'], dict):
                images = res['output'].get('images')
                if images and isinstance(images, list) and images:
                    img = images[0]
                    if isinstance(img, dict):
                        image_url = img.get('url')
                    elif isinstance(img, str):
                        image_url = img
            if not image_url and res.get('request_id'):
                try:
                    status_url = resp.headers.get('x-fal-queue-status-url') or f"https://queue.fal.run/fal-ai/nano-banana/requests/{res['request_id']}/status"
                    result_url = resp.headers.get('x-fal-queue-response-url') or f"https://queue.fal.run/fal-ai/nano-banana/requests/{res['request_id']}"
                    for _ in range(60):
                        time.sleep(2)
                        s = requests.get(status_url, headers=headers, timeout=30)
                        s.raise_for_status()
                        st = s.json()
                        if st.get('status') == 'COMPLETED':
                            r2 = requests.get(result_url, headers=headers, timeout=60)
                            r2.raise_for_status()
                            rj = r2.json()
                            if rj.get('images') and rj['images']:
                                img = rj['images'][0]
                                image_url = img.get('url') if isinstance(img, dict) else img
                            break
                except Exception as ex:
                    return JsonResponse({'status': 'error', 'message': 'Error esperando resultado', 'detail': str(ex)})

        if not image_url:
            return JsonResponse({'status': 'error', 'message': 'Respuesta inesperada de NanoBanana', 'raw': res})

        return JsonResponse({'status': 'ok', 'image_url': image_url})
    except requests.exceptions.HTTPError as e:
        try:
            return JsonResponse({'status': 'error', 'message': f'Error HTTP: {e}', 'detail': resp.text})
        except Exception:
            return JsonResponse({'status': 'error', 'message': f'Error HTTP: {e}'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})
