import json
import base64
import uuid
import requests
import time
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

def _save_generated_image(request, image_bytes, user_id):
    pathname = f"ai/{user_id}/{uuid.uuid4().hex}.png"
    try:
        saved_name = default_storage.save(pathname, ContentFile(image_bytes))
        return request.build_absolute_uri(default_storage.url(saved_name))
    except Exception:
        return None


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
        return JsonResponse({
            'status': 'demo',
            'message': 'Modo demostración - No hay API key configurada',
            'hint': 'Configura OPENAI_API_KEY en .env para usar la generación por IA'
        })

    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.images.generate(
            model="gpt-image-1",
            prompt=f"{prompt}, estilo: {style}, arte digital",
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

    if not prompt and not image_b64:
        return JsonResponse({'status': 'error', 'message': 'Se requiere un prompt o una imagen'})

    repl_key = getattr(settings, 'REPLICATE_API_TOKEN', '') or os.environ.get('REPLICATE_API_TOKEN', '')
    if repl_key and replicate is not None:
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
                image_url = output.get('url') or (output.get('output') and output['output'][0] if isinstance(output.get('output'), list) else None)
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
            'hint': 'Añade REPLICATE_API_TOKEN o FAL_KEY a tu .env'
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
