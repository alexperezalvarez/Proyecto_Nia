from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(max_length=500, blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    website = models.URLField(max_length=200, blank=True, default='')
    location = models.CharField(max_length=100, blank=True, default='')
    twitter = models.CharField(max_length=100, blank=True, default='')
    instagram = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Perfil de {self.user.username}'

    @property
    def drawing_count(self):
        return self.user.drawings.count()

    @property
    def total_layers(self):
        from canvas.models import Drawing
        return Drawing.objects.filter(user=self.user).aggregate(
            models.Sum('layers')
        ) or 0


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()
