from django.urls import path
from . import views

app_name = 'canvas'

urlpatterns = [
    path('editor/', views.editor, name='editor'),
    path('editor/<int:drawing_id>/', views.editor, name='editor'),
    path('gallery/', views.gallery, name='gallery'),
    path('new/', views.new_drawing, name='new_drawing'),
    path('save/<int:drawing_id>/', views.save_drawing, name='save_drawing'),
    path('save-layer/<int:drawing_id>/', views.save_layer, name='save_layer'),
    path('delete-layer/<int:drawing_id>/<int:layer_id>/', views.delete_layer, name='delete_layer'),
    path('upload-thumbnail/<int:drawing_id>/', views.upload_thumbnail, name='upload_thumbnail'),
    path('export/<int:drawing_id>/', views.export_drawing, name='export_drawing'),
    path('ai-generate/', views.ai_generate, name='ai_generate'),
    path('ai-ideas/', views.ai_ideas, name='ai_ideas'),
]
