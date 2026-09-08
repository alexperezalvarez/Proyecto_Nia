from django import forms
from django.contrib.auth.forms import UserCreationForm, PasswordChangeForm
from django.contrib.auth.models import User
from .models import Profile


INPUT_ATTRS = {
    'class': 'pf-input',
    'autocomplete': 'off',
}


class UserRegisterForm(UserCreationForm):
    email = forms.EmailField(label='Correo electrónico', required=True, widget=forms.EmailInput(attrs={
        **INPUT_ATTRS, 'placeholder': 'correo@ejemplo.com'
    }))
    username = forms.CharField(label='Nombre de usuario', widget=forms.TextInput(attrs={
        **INPUT_ATTRS, 'placeholder': 'Nombre de usuario'
    }))
    password1 = forms.CharField(label='Contraseña', widget=forms.PasswordInput(attrs={
        **INPUT_ATTRS, 'placeholder': 'Contraseña'
    }))
    password2 = forms.CharField(label='Confirmar contraseña', widget=forms.PasswordInput(attrs={
        **INPUT_ATTRS, 'placeholder': 'Repite la contraseña'
    }))

    class Meta:
        model = User
        fields = ['username', 'email', 'password1', 'password2']


class UserForm(forms.ModelForm):
    username = forms.CharField(
        label='Nombre de usuario',
        widget=forms.TextInput(attrs={**INPUT_ATTRS, 'placeholder': 'Nombre de usuario'}),
        max_length=150,
    )
    email = forms.EmailField(
        label='Correo electrónico',
        widget=forms.EmailInput(attrs={**INPUT_ATTRS, 'placeholder': 'correo@ejemplo.com'}),
    )
    first_name = forms.CharField(
        label='Nombre',
        required=False,
        widget=forms.TextInput(attrs={**INPUT_ATTRS, 'placeholder': 'Tu nombre'}),
        max_length=30,
    )
    last_name = forms.CharField(
        label='Apellido',
        required=False,
        widget=forms.TextInput(attrs={**INPUT_ATTRS, 'placeholder': 'Tu apellido'}),
        max_length=30,
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance:
            self.fields['username'].initial = self.instance.username
            self.fields['email'].initial = self.instance.email
            self.fields['first_name'].initial = self.instance.first_name
            self.fields['last_name'].initial = self.instance.last_name

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if User.objects.filter(username=username).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError('Este nombre de usuario ya está en uso.')
        return username

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError('Este correo ya está registrado.')
        return email

    def save(self, commit=True):
        user = super().save(commit=False)
        user.username = self.cleaned_data['username']
        user.email = self.cleaned_data['email']
        user.first_name = self.cleaned_data.get('first_name', '')
        user.last_name = self.cleaned_data.get('last_name', '')
        if commit:
            user.save()
        return user


class ProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ['bio', 'website', 'location', 'twitter', 'instagram']
        widgets = {
            'bio': forms.Textarea(attrs={
                **INPUT_ATTRS,
                'placeholder': 'Cuéntanos sobre ti y tu arte...',
                'rows': 4,
            }),
            'website': forms.URLInput(attrs={
                **INPUT_ATTRS, 'placeholder': 'https://tusitio.com'
            }),
            'location': forms.TextInput(attrs={
                **INPUT_ATTRS, 'placeholder': 'Ciudad, País'
            }),
            'twitter': forms.TextInput(attrs={
                **INPUT_ATTRS, 'placeholder': '@usuario'
            }),
            'instagram': forms.TextInput(attrs={
                **INPUT_ATTRS, 'placeholder': '@usuario'
            }),
        }


class AvatarForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ['avatar']
        widgets = {
            'avatar': forms.FileInput(attrs={
                'class': 'pf-avatar-input',
                'accept': 'image/*',
            }),
        }


class AccountDeleteForm(forms.Form):
    confirm = forms.CharField(
        label='Escribe ELIMINAR para confirmar',
        widget=forms.TextInput(attrs={
            **INPUT_ATTRS,
            'placeholder': 'ELIMINAR',
        }),
    )

    def clean_confirm(self):
        confirm = self.cleaned_data.get('confirm', '')
        if confirm != 'ELIMINAR':
            raise forms.ValidationError('Debes escribir ELIMINAR para confirmar.')
        return confirm
