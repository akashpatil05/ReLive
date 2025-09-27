# api/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models.signals import post_delete
from django.dispatch import receiver
import secrets


class FamilyMember(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="family_members")
    name = models.CharField(max_length=120)
    relation = models.CharField(max_length=120, blank=True)
    # Keep ImageField for any legacy/local avatar; can later switch to a URLField if moving to Cloudinary
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
        # Prevent duplicate family members with same name for same user
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'name'], 
                name='unique_family_member_per_user'
            )
        ]

    def __str__(self):
        rel = f" ({self.relation})" if self.relation else ""
        return f"{self.name}{rel}"


class Memory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memories")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)  # Allow blank descriptions
    date = models.DateField()
    location = models.CharField(max_length=255, blank=True)
    tag = models.CharField(max_length=100, blank=True)

    # Legacy/local uploads (optional during transition)
    image = models.ImageField(upload_to="memories/", blank=True, null=True)

    # Cloudinary delivery URL (preferred going forward)
    image_url = models.URLField(max_length=600, blank=True, null=True)

    # Optional: people tagging
    members = models.ManyToManyField('FamilyMember', blank=True, related_name="memories")

    created_at = models.DateTimeField(auto_now_add=True)

    def get_media_counts(self):
        """Get counts of all media types for this memory"""
        return {
            'images': self.images.count(),
            'videos': self.videos.count(), 
            'voice_recordings': self.voice_recordings.count(),
            'people': self.tagged_people.count(),
            'tags': self.event_tags.count()
        }

    def __str__(self):
        return self.title


# ------------------ MEMORY MEDIA MODELS ------------------ #

class MemoryImage(models.Model):
    """Multiple images per memory"""
    memory = models.ForeignKey(Memory, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to="memory_images/", blank=True, null=True)
    image_url = models.URLField(max_length=600, blank=True, null=True)  # Cloudinary URL
    caption = models.CharField(max_length=255, blank=True)
    order = models.PositiveIntegerField(default=0)  # For ordering images
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['memory', 'order']),
        ]

    def __str__(self):
        return f"Image {self.order + 1} for {self.memory.title}"


class MemoryVideo(models.Model):
    """Multiple videos per memory"""
    memory = models.ForeignKey(Memory, on_delete=models.CASCADE, related_name='videos')
    video = models.FileField(upload_to="memory_videos/", blank=True, null=True)
    video_url = models.URLField(max_length=600, blank=True, null=True)  # Cloudinary URL
    thumbnail_url = models.URLField(max_length=600, blank=True, null=True)
    caption = models.CharField(max_length=255, blank=True)
    duration = models.DurationField(blank=True, null=True)
    file_size = models.PositiveBigIntegerField(blank=True, null=True)  # File size in bytes
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['memory', 'order']),
        ]

    def __str__(self):
        return f"Video {self.order + 1} for {self.memory.title}"


class MemoryVoiceRecording(models.Model):
    """Voice recordings per memory"""
    memory = models.ForeignKey(Memory, on_delete=models.CASCADE, related_name='voice_recordings')
    audio = models.FileField(upload_to="memory_audio/", blank=True, null=True)
    audio_url = models.URLField(max_length=600, blank=True, null=True)  # Cloudinary URL
    speaker_name = models.CharField(max_length=100, blank=True)  # Who's speaking
    speaker_relation = models.CharField(max_length=100, blank=True)  # e.g., "Daughter", "Son"
    duration = models.DurationField(blank=True, null=True)
    file_size = models.PositiveBigIntegerField(blank=True, null=True)  # File size in bytes
    transcript = models.TextField(blank=True)  # Optional transcript
    waveform_data = models.JSONField(blank=True, null=True)  # For audio waveform visualization
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['memory', 'created_at']),
            models.Index(fields=['speaker_name']),
        ]

    def __str__(self):
        speaker = self.speaker_name or "Unknown"
        return f"Recording by {speaker} for {self.memory.title}"


class MemoryPerson(models.Model):
    """People tagged in memories"""
    memory = models.ForeignKey(Memory, on_delete=models.CASCADE, related_name='tagged_people')
    name = models.CharField(max_length=100)
    relation = models.CharField(max_length=100, blank=True)  # e.g., "Grandpa", "Sister"
    avatar_url = models.URLField(max_length=600, blank=True, null=True)  # Optional avatar
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['memory', 'name']
        indexes = [
            models.Index(fields=['memory', 'name']),
        ]

    def __str__(self):
        relation_text = f" ({self.relation})" if self.relation else ""
        return f"{self.name}{relation_text} in {self.memory.title}"


class MemoryTag(models.Model):
    """Event tags for memories"""
    memory = models.ForeignKey(Memory, on_delete=models.CASCADE, related_name='event_tags')
    tag_name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default="#999999")  # Hex color
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['memory', 'tag_name']
        indexes = [
            models.Index(fields=['memory', 'tag_name']),
        ]

    def __str__(self):
        return f"{self.tag_name} - {self.memory.title}"


# ------------------ FAMILY LINKS (patient <-> family user) ------------------ #
class FamilyLink(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REVOKED", "Revoked"),
    ]
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="family_links_as_patient")
    family_member = models.ForeignKey(User, on_delete=models.CASCADE, related_name="family_links_as_family")
    relation = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="APPROVED")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Prevent duplicate connections between same patient and family member
        constraints = [
            models.UniqueConstraint(
                fields=['patient', 'family_member'], 
                name='unique_family_link'
            )
        ]
        indexes = [
            models.Index(fields=["patient", "family_member"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.family_member} -> {self.patient} ({self.status})"


# ------------------ PATIENT SHARE CODE (connect via code) ------------------ #
class PatientConnectCode(models.Model):
    patient = models.OneToOneField(User, on_delete=models.CASCADE, related_name="connect_code")
    code = models.CharField(max_length=16, unique=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["code"])]

    def __str__(self):
        return f"{self.patient.username} [{self.code}]"

    def is_valid(self) -> bool:
        return timezone.now() < self.expires_at

    @staticmethod
    def generate_code() -> str:
        """
        Generate a short, readable code like '6Y8K-P2'.
        """
        raw = secrets.token_urlsafe(6).upper().replace("-", "")[:7]
        return f"{raw[:4]}-{raw[4:]}"


# ------------------ MEMORY INTERACTION MODELS (Optional - for likes, comments, etc.) ------------------ #

class MemoryLike(models.Model):
    """Track memory likes"""
    memory = models.ForeignKey(Memory, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memory_likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['memory', 'user']
        indexes = [
            models.Index(fields=['memory', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} likes {self.memory.title}"


class MemoryComment(models.Model):
    """Comments on memories"""
    memory = models.ForeignKey(Memory, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memory_comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['memory', '-created_at']),
        ]

    def __str__(self):
        content_preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"{self.user.username}: {content_preview}"


# ------------------ SIGNALS FOR BIDIRECTIONAL DELETION ------------------ #

@receiver(post_delete, sender=FamilyMember)
def delete_corresponding_family_link(sender, instance, **kwargs):
    """
    When a patient deletes a FamilyMember, also delete the corresponding FamilyLink
    so it disappears from the family member's dashboard too.
    """
    try:
        # Find the family user by username (name field in FamilyMember)
        family_user = User.objects.get(username=instance.name)
        
        # Find and delete the corresponding FamilyLink
        family_link = FamilyLink.objects.filter(
            patient=instance.user,  # The patient who owned the FamilyMember
            family_member=family_user  # The actual family user
        ).first()
        
        if family_link:
            print(f"🔗 Deleting FamilyLink: {family_link}")
            family_link.delete()
            print(f"✅ Successfully deleted FamilyLink for {instance.name}")
        else:
            print(f"ℹ️ No FamilyLink found for {instance.name} -> {instance.user.username}")
            
    except User.DoesNotExist:
        print(f"⚠️ No user found with username: {instance.name}")
    except Exception as e:
        print(f"❌ Error deleting FamilyLink: {e}")


@receiver(post_delete, sender=FamilyLink)
def delete_corresponding_family_member(sender, instance, **kwargs):
    """
    When a FamilyLink is deleted, also delete the corresponding FamilyMember
    so it disappears from the patient's dashboard too.
    """
    try:
        # Find the corresponding FamilyMember record
        family_member = FamilyMember.objects.filter(
            user=instance.patient,  # The patient
            name=instance.family_member.username  # Family member's username
        ).first()
        
        if family_member:
            print(f"👪 Deleting FamilyMember: {family_member}")
            # Temporarily disconnect the signal to avoid infinite loop
            post_delete.disconnect(delete_corresponding_family_link, sender=FamilyMember)
            family_member.delete()
            post_delete.connect(delete_corresponding_family_link, sender=FamilyMember)
            print(f"✅ Successfully deleted FamilyMember {family_member.name}")
        else:
            print(f"ℹ️ No FamilyMember found for {instance.family_member.username} in {instance.patient.username}'s list")
            
    except Exception as e:
        print(f"❌ Error deleting FamilyMember: {e}")
        # Reconnect the signal in case of error
        post_delete.connect(delete_corresponding_family_link, sender=FamilyMember)


# ------------------ CASCADE DELETION FOR MEMORY MEDIA ------------------ #

@receiver(post_delete, sender=MemoryImage)
def cleanup_memory_image_files(sender, instance, **kwargs):
    """Clean up image files when MemoryImage is deleted"""
    if instance.image:
        try:
            instance.image.delete(save=False)
        except:
            pass  # File might not exist


@receiver(post_delete, sender=MemoryVideo)
def cleanup_memory_video_files(sender, instance, **kwargs):
    """Clean up video files when MemoryVideo is deleted"""
    if instance.video:
        try:
            instance.video.delete(save=False)
        except:
            pass  # File might not exist


@receiver(post_delete, sender=MemoryVoiceRecording)
def cleanup_memory_audio_files(sender, instance, **kwargs):
    """Clean up audio files when MemoryVoiceRecording is deleted"""
    if instance.audio:
        try:
            instance.audio.delete(save=False)
        except:
            pass  # File might not exist
