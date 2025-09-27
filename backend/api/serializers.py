from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Memory, FamilyMember, FamilyLink, PatientConnectCode,
    MemoryImage, MemoryVideo, MemoryVoiceRecording, MemoryPerson, MemoryTag,
    MemoryLike, MemoryComment
)

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )

class UserSafeSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "role"]

    def get_role(self, obj):
        return getattr(obj, "role", None)

class FamilyMemberSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(required=False, allow_null=True)
    memories_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = FamilyMember
        fields = ["id", "name", "relation", "avatar", "memories_count"]

    def get_memories_count(self, obj):
        return obj.memories.count() if hasattr(obj, "memories") else 0

    def create(self, validated_data):
        user = self.context["request"].user
        return FamilyMember.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

# ------------------ MEMORY MEDIA SERIALIZERS ------------------ #

class MemoryImageSerializer(serializers.ModelSerializer):
    """Serializer for memory images"""
    image = serializers.ImageField(required=False, allow_null=True)
    image_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    resolved_image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MemoryImage
        fields = ['id', 'memory', 'image', 'image_url', 'resolved_image_url', 'caption', 'order', 'created_at']
        read_only_fields = ['created_at']

    def get_resolved_image_url(self, obj):
        """Return the best available image URL"""
        if obj.image_url:
            return obj.image_url
        if obj.image:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None

class MemoryVideoSerializer(serializers.ModelSerializer):
    """Serializer for memory videos"""
    video = serializers.FileField(required=False, allow_null=True)
    video_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    resolved_video_url = serializers.SerializerMethodField(read_only=True)
    duration_formatted = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MemoryVideo
        fields = [
            'id', 'memory', 'video', 'video_url', 'resolved_video_url', 
            'thumbnail_url', 'caption', 'duration', 'duration_formatted',
            'file_size', 'order', 'created_at'
        ]
        read_only_fields = ['created_at']

    def get_resolved_video_url(self, obj):
        """Return the best available video URL"""
        if obj.video_url:
            return obj.video_url
        if obj.video:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.video.url) if request else obj.video.url
        return None

    def get_duration_formatted(self, obj):
        """Format duration for display (e.g., "2:30")"""
        if obj.duration:
            total_seconds = int(obj.duration.total_seconds())
            minutes = total_seconds // 60
            seconds = total_seconds % 60
            return f"{minutes}:{seconds:02d}"
        return None

class MemoryVoiceRecordingSerializer(serializers.ModelSerializer):
    """Serializer for memory voice recordings"""
    audio = serializers.FileField(required=False, allow_null=True)
    audio_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    resolved_audio_url = serializers.SerializerMethodField(read_only=True)
    duration_formatted = serializers.SerializerMethodField(read_only=True)
    speaker_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MemoryVoiceRecording
        fields = [
            'id', 'memory', 'audio', 'audio_url', 'resolved_audio_url',
            'speaker_name', 'speaker_relation', 'speaker_display',
            'duration', 'duration_formatted', 'file_size', 'transcript',
            'waveform_data', 'created_at'
        ]
        read_only_fields = ['created_at']

    def get_resolved_audio_url(self, obj):
        """Return the best available audio URL"""
        if obj.audio_url:
            return obj.audio_url
        if obj.audio:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.audio.url) if request else obj.audio.url
        return None

    def get_duration_formatted(self, obj):
        """Format duration for display (e.g., "2:30")"""
        if obj.duration:
            total_seconds = int(obj.duration.total_seconds())
            minutes = total_seconds // 60
            seconds = total_seconds % 60
            return f"{minutes}:{seconds:02d}"
        return None

    def get_speaker_display(self, obj):
        """Get formatted speaker display name"""
        if obj.speaker_name and obj.speaker_relation:
            return f"{obj.speaker_name} ({obj.speaker_relation})"
        return obj.speaker_name or "Unknown Speaker"

class MemoryPersonSerializer(serializers.ModelSerializer):
    """Serializer for people tagged in memories"""
    avatar_initials = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MemoryPerson
        fields = ['id', 'memory', 'name', 'relation', 'avatar_url', 'avatar_initials', 'created_at']
        read_only_fields = ['created_at']

    def get_avatar_initials(self, obj):
        """Generate avatar initials from name"""
        if not obj.name:
            return "??"
        parts = obj.name.strip().split()
        if len(parts) >= 2:
            return (parts[0][0] + parts[1][0]).upper()
        elif len(parts) == 1:
            return parts[0][:2].upper()
        return "??"

class MemoryTagSerializer(serializers.ModelSerializer):
    """Serializer for memory event tags"""
    class Meta:
        model = MemoryTag
        fields = ['id', 'memory', 'tag_name', 'color', 'created_at']
        read_only_fields = ['created_at']

class MemoryLikeSerializer(serializers.ModelSerializer):
    """Serializer for memory likes"""
    user_username = serializers.ReadOnlyField(source="user.username")

    class Meta:
        model = MemoryLike
        fields = ['id', 'memory', 'user', 'user_username', 'created_at']
        read_only_fields = ['created_at']

class MemoryCommentSerializer(serializers.ModelSerializer):
    """Serializer for memory comments"""
    user_username = serializers.ReadOnlyField(source="user.username")
    user_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MemoryComment
        fields = ['id', 'memory', 'user', 'user_username', 'user_display', 'content', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_user_display(self, obj):
        """Get user display name"""
        return getattr(obj.user, 'first_name', None) or obj.user.username

# ------------------ ENHANCED MEMORY SERIALIZERS ------------------ #

class MemorySerializer(serializers.ModelSerializer):
    """Standard memory serializer for list views"""
    username = serializers.ReadOnlyField(source="user.username")
    image_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    resolved_image_url = serializers.SerializerMethodField(read_only=True)
    
    # Basic counts for quick overview
    images_count = serializers.SerializerMethodField(read_only=True)
    videos_count = serializers.SerializerMethodField(read_only=True)
    recordings_count = serializers.SerializerMethodField(read_only=True)
    likes_count = serializers.SerializerMethodField(read_only=True)
    is_liked = serializers.SerializerMethodField(read_only=True)

    members = serializers.PrimaryKeyRelatedField(
        many=True, required=False, queryset=FamilyMember.objects.none()
    )
    members_detail = FamilyMemberSerializer(source="members", many=True, read_only=True)

    class Meta:
        model = Memory
        fields = [
            "id", "username", "title", "description", "date", "location", "tag",
            "image_url", "resolved_image_url", "members", "members_detail",
            "images_count", "videos_count", "recordings_count", 
            "likes_count", "is_liked", "created_at"
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user and "members" in self.fields:
            self.fields["members"].queryset = FamilyMember.objects.filter(user=request.user)

    def get_resolved_image_url(self, obj):
        if getattr(obj, "image_url", None):
            return obj.image_url
        if getattr(obj, "image", None):
            request = self.context.get("request")
            url = obj.image.url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_images_count(self, obj):
        return getattr(obj, 'images_count', obj.images.count())

    def get_videos_count(self, obj):
        return getattr(obj, 'videos_count', obj.videos.count())

    def get_recordings_count(self, obj):
        return getattr(obj, 'recordings_count', obj.voice_recordings.count())

    def get_likes_count(self, obj):
        return getattr(obj, 'likes_count', obj.likes.count())

    def get_is_liked(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

    def create(self, validated_data):
        members = validated_data.pop("members", [])
        validated_data.pop("user", None)
        user = self.context["request"].user
        memory = Memory.objects.create(user=user, **validated_data)
        if members:
            memory.members.set(members)
        return memory

    def update(self, instance, validated_data):
        members = validated_data.pop("members", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if members is not None:
            instance.members.set(members)
        return instance

class MemoryDetailSerializer(serializers.ModelSerializer):
    """Enhanced serializer for memory detail page with all related media"""
    username = serializers.ReadOnlyField(source="user.username")
    user_display = serializers.SerializerMethodField(read_only=True)
    resolved_image_url = serializers.SerializerMethodField(read_only=True)
    
    # Related media
    images = MemoryImageSerializer(many=True, read_only=True)
    videos = MemoryVideoSerializer(many=True, read_only=True)
    voice_recordings = MemoryVoiceRecordingSerializer(many=True, read_only=True)
    tagged_people = MemoryPersonSerializer(many=True, read_only=True)
    event_tags = MemoryTagSerializer(many=True, read_only=True)
    likes = MemoryLikeSerializer(many=True, read_only=True)
    comments = MemoryCommentSerializer(many=True, read_only=True)
    
    # Aggregate data
    media_counts = serializers.SerializerMethodField(read_only=True)
    is_liked = serializers.SerializerMethodField(read_only=True)
    can_edit = serializers.SerializerMethodField(read_only=True)

    # Legacy fields
    members_detail = FamilyMemberSerializer(source="members", many=True, read_only=True)
    
    class Meta:
        model = Memory
        fields = [
            'id', 'title', 'description', 'date', 'location', 'tag',
            'image', 'image_url', 'resolved_image_url', 'created_at',
            'username', 'user_display', 'user',
            'images', 'videos', 'voice_recordings', 'tagged_people', 'event_tags',
            'likes', 'comments', 'members_detail',
            'media_counts', 'is_liked', 'can_edit'
        ]
        
    def get_user_display(self, obj):
        """Get user display name"""
        return getattr(obj.user, 'first_name', None) or obj.user.username

    def get_resolved_image_url(self, obj):
        """Return the best available main image URL"""
        if obj.image_url:
            return obj.image_url
        if obj.image:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None

    def get_media_counts(self, obj):
        """Get counts of all media types"""
        return {
            'images': obj.images.count(),
            'videos': obj.videos.count(),
            'voice_recordings': obj.voice_recordings.count(),
            'people': obj.tagged_people.count(),
            'tags': obj.event_tags.count(),
            'likes': obj.likes.count(),
            'comments': obj.comments.count()
        }

    def get_is_liked(self, obj):
        """Check if current user liked this memory"""
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

    def get_can_edit(self, obj):
        """Check if current user can edit this memory"""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        
        # Memory owner can always edit
        if obj.user == request.user:
            return True
            
        # Family members with approved links can edit
        from .models import FamilyLink
        return FamilyLink.objects.filter(
            patient=obj.user,
            family_member=request.user,
            status="APPROVED"
        ).exists()

# ------------------ EXISTING SERIALIZERS (Updated) ------------------ #

class FamilyLinkSerializer(serializers.ModelSerializer):
    patient_username = serializers.ReadOnlyField(source="patient.username")
    family_username = serializers.ReadOnlyField(source="family_member.username")
    patient_display = serializers.SerializerMethodField(read_only=True)
    family_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = FamilyLink
        fields = [
            "id", "patient", "patient_username", "patient_display",
            "family_member", "family_username", "family_display",
            "relation", "status", "created_at",
        ]
        read_only_fields = ["status", "created_at"]

    def get_patient_display(self, obj):
        return getattr(obj.patient, 'first_name', None) or obj.patient.username

    def get_family_display(self, obj):
        return getattr(obj.family_member, 'first_name', None) or obj.family_member.username

class PatientConnectCodeSerializer(serializers.ModelSerializer):
    is_valid = serializers.SerializerMethodField(read_only=True)
    expires_in_minutes = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PatientConnectCode
        fields = ["code", "expires_at", "is_valid", "expires_in_minutes", "created_at"]

    def get_is_valid(self, obj):
        return obj.is_valid()

    def get_expires_in_minutes(self, obj):
        from django.utils import timezone
        if obj.expires_at > timezone.now():
            delta = obj.expires_at - timezone.now()
            return int(delta.total_seconds() / 60)
        return 0
