from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib import messages
from .forms import UserRegisterForm, UserForm, ProfileForm, AvatarForm, AccountDeleteForm


def register(request):
    if request.method == 'POST':
        form = UserRegisterForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, '¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.')
            return redirect('account_login')
    else:
        form = UserRegisterForm()
    return render(request, 'accounts/register.html', {'form': form})


@login_required
def profile(request):
    user = request.user
    user_form = UserForm(instance=user)
    profile_form = ProfileForm(instance=user.profile)
    avatar_form = AvatarForm(instance=user.profile)
    password_form = PasswordChangeForm(user)
    delete_form = AccountDeleteForm()

    if request.method == 'POST':
        section = request.POST.get('section', '')

        if section == 'user':
            user_form = UserForm(request.POST, instance=user)
            if user_form.is_valid():
                user_form.save()
                messages.success(request, 'Datos de cuenta actualizados.')
                return redirect('accounts:profile')

        elif section == 'profile':
            profile_form = ProfileForm(request.POST, instance=user.profile)
            if profile_form.is_valid():
                profile_form.save()
                messages.success(request, 'Perfil actualizado.')
                return redirect('accounts:profile')

        elif section == 'avatar':
            avatar_form = AvatarForm(request.POST, request.FILES, instance=user.profile)
            if avatar_form.is_valid():
                avatar_form.save()
                messages.success(request, 'Avatar actualizado.')
                return redirect('accounts:profile')

        elif section == 'password':
            password_form = PasswordChangeForm(user, request.POST)
            if password_form.is_valid():
                user = password_form.save()
                update_session_auth_hash(request, user)
                messages.success(request, 'Contraseña cambiada.')
                return redirect('accounts:profile')

        elif section == 'delete':
            delete_form = AccountDeleteForm(request.POST)
            if delete_form.is_valid():
                user.delete()
                messages.success(request, 'Cuenta eliminada.')
                return redirect('index')

    context = {
        'user_form': user_form,
        'profile_form': profile_form,
        'avatar_form': avatar_form,
        'password_form': password_form,
        'delete_form': delete_form,
        'drawing_count': user.drawings.count(),
    }
    return render(request, 'accounts/profile.html', context)
