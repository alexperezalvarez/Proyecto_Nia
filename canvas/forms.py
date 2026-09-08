from django import forms
from .models import Drawing

class DrawingForm(forms.ModelForm):
    class Meta:
        model = Drawing
        fields = ['title', 'width', 'height']
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-control', 'placeholder': 'Título del dibujo'
            }),
            'width': forms.NumberInput(attrs={
                'class': 'form-control', 'min': 100, 'max': 4000
            }),
            'height': forms.NumberInput(attrs={
                'class': 'form-control', 'min': 100, 'max': 4000
            }),
        }
