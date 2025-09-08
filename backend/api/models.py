from django.db import models
from django.contrib.auth.models import User

class Memory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memories")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='memories/', blank=True, null=True)  # optional
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title