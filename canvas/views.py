import json
import base64
from io import BytesIO
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.contrib import messages
from django.conf import settings
from django.core.files.base import ContentFile
from .models import Drawing, Layer
from .forms import DrawingForm

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

    if layer_id:
        layer = get_object_or_404(Layer, id=layer_id, drawing=drawing)
    else:
        layer = Layer(drawing=drawing)
        max_order = drawing.layers.aggregate(models.Max('order'))['order__max']
        layer.order = (max_order or 0) + 1

    layer.name = layer_name
    layer.opacity = layer_opacity
    layer.visible = layer_visible
    layer.data = layer_data
    layer.save()

    return JsonResponse({'status': 'ok', 'layer_id': layer.id})

@login_required
@require_POST
def delete_layer(request, drawing_id, layer_id):
    drawing = get_object_or_404(Drawing, id=drawing_id, user=request.user)
    layer = get_object_or_404(Layer, id=layer_id, drawing=drawing)
    layer.delete()
    return JsonResponse({'status': 'ok'})

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
            model="dall-e-3",
            prompt=f"{prompt}, estilo: {style}, arte digital",
            size="1024x1024",
            quality="standard",
            n=1,
        )
        image_url = response.data[0].url
        return JsonResponse({'status': 'ok', 'image_url': image_url})
    except openai.APIError as e:
        return JsonResponse({
            'status': 'no_access',
            'message': 'Esta API key no tiene acceso a DALL-E. Usa GPT-4o para obtener ideas creativas.',
            'hint': str(e)
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})

@login_required
@require_POST
def ai_ideas(request):
    data = json.loads(request.body)
    prompt = data.get('prompt', '')
    style = data.get('style', 'digital-art')

    if not prompt:
        return JsonResponse({'status': 'error', 'message': 'Se requiere un prompt'})

    api_key = getattr(settings, 'OPENAI_API_KEY', '')
    if not api_key:
        return JsonResponse({'status': 'error', 'message': 'No hay API key configurada'})

    import openai
    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "Eres un asistente experto en arte digital y diseño gráfico. Responde en español. Genera ideas creativas y consejos prácticos para ayudar al usuario a dibujar lo que describe. Sé específico y útil."},
                {"role": "user", "content": f"Quiero dibujar: {prompt}. Estilo: {style}. Dame ideas creativas, consejos de composición, paleta de colores sugerida y técnicas que podría usar."}
            ],
            max_tokens=500,
        )
        ideas = response.choices[0].message.content
        return JsonResponse({'status': 'ok', 'ideas': ideas})
    except openai.RateLimitError:
        return JsonResponse({'status': 'ok', 'ideas': '💡 **Ideas para tu dibujo:**\n\n'
            '• **Composición**: Prueba con la regla de los tercios para equilibrar los elementos.\n'
            '• **Paleta de colores**: Usa tonos complementarios para dar contraste.\n'
            '• **Técnica**: Empieza con bocetos ligeros y ve añadiendo detalles progresivamente.\n'
            '• **Inspiración**: Busca referencias visuales en Pinterest o Google Images.\n\n'
            '⚠️ La API de OpenAI no tiene créditos disponibles. Las ideas de arriba son sugerencias generales.'})
    except Exception as e:
        return JsonResponse({'status': 'ok', 'ideas': '💡 **Sugerencias para dibujar:**\n\n'
            '• Define primero las formas básicas (círculos, rectángulos) antes de detallar.\n'
            '• Trabaja de lo general a lo particular: fondo, luego objetos principales, después detalles.\n'
            '• Usa capas separadas para cada elemento, así puedes ajustarlos sin afectar el resto.\n'
            '• Experimenta con diferentes grosores de pincel para dar profundidad.\n\n'
            f'💬 {prompt} - {style}. ¡Confía en tu creatividad y practica!'})
