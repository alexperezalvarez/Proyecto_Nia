import json
from django.db import models
from django.contrib.auth.models import User

class Drawing(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='drawings')
    title = models.CharField(max_length=200, default='Sin título')
    thumbnail = models.ImageField(upload_to='thumbnails/', blank=True, null=True)
    width = models.IntegerField(default=1200)
    height = models.IntegerField(default=800)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Dibujo'
        verbose_name_plural = 'Dibujos'

    def __str__(self):
        return f'{self.title} - {self.user.username}'

class Layer(models.Model):
    drawing = models.ForeignKey(Drawing, on_delete=models.CASCADE, related_name='layers')
    name = models.CharField(max_length=100, default='Capa 1')
    order = models.IntegerField(default=0)
    opacity = models.FloatField(default=1.0)
    visible = models.BooleanField(default=True)
    locked = models.BooleanField(default=False)
    data = models.JSONField(default=dict)

    class Meta:
        ordering = ['order']
        verbose_name = 'Capa'
        verbose_name_plural = 'Capas'

    def __str__(self):
        return f'{self.name} - {self.drawing.title}'
