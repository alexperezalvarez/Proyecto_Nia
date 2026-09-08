from django.contrib import admin
from .models import Drawing, Layer

class LayerInline(admin.TabularInline):
    model = Layer
    extra = 1

@admin.register(Drawing)
class DrawingAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'created_at', 'updated_at']
    list_filter = ['created_at', 'user']
    search_fields = ['title', 'user__username']
    inlines = [LayerInline]

@admin.register(Layer)
class LayerAdmin(admin.ModelAdmin):
    list_display = ['name', 'drawing', 'order', 'opacity', 'visible', 'locked']
    list_filter = ['visible', 'locked']
