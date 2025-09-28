# api/views.py
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q, Count, Prefetch

import cloudinary
import cloudinary.uploader  # Cloudinary upload
from decouple import config

# EXPLICITLY configure Cloudinary - this fixes the "Must supply api_key" error
cloudinary.config(
    cloud_name=config('CLOUDINARY_CLOUD_NAME', default='dkbn1i1gb'),
    api_key=config('CLOUDINARY_API_KEY', default='342665191177661'),
    api_secret=config('CLOUDINARY_API_SECRET', default='lGHX7m0FUk-d1vmFvYKcz997JvM'),
    secure=True  # Use HTTPS URLs
)

from .serializers import (
    UserSerializer, UserSafeSerializer,
    MemorySerializer, MemoryDetailSerializer, FamilyMemberSerializer,
    PatientConnectCodeSerializer, FamilyLinkSerializer,
    MemoryImageSerializer, MemoryVideoSerializer, MemoryVoiceRecordingSerializer,
    MemoryPersonSerializer, MemoryTagSerializer, MemoryLikeSerializer, MemoryCommentSerializer
)
from .models import (
    Memory, FamilyMember, PatientConnectCode, FamilyLink,
    MemoryImage, MemoryVideo, MemoryVoiceRecording, MemoryPerson, MemoryTag,
    MemoryLike, MemoryComment
)

User = get_user_model()

# ------------- helpers ------------- #
def is_patient(user):
    return getattr(user, "role", "patient") == "patient"

def is_family(user):
    return getattr(user, "role", "family") == "family"

def can_access_patient_data(family_user, patient_id):
    """Check if family member has access to patient's data"""
    return FamilyLink.objects.filter(
        family_member=family_user,
        patient_id=patient_id,
        status="APPROVED"
    ).exists()

# ------------------ AUTH ------------------ #
@api_view(["POST"])
@permission_classes([AllowAny])
def register_user(request):
    data = request.data.copy()
    username = data.get("username") or data.get("full_name")
    if not username:
        return Response({"username": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)

    payload = {"username": username, "email": data.get("email", ""), "password": data.get("password", "")}
    serializer = UserSerializer(data=payload)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            "message": "User registered successfully",
            "user": UserSafeSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@permission_classes([AllowAny])
def login_user(request):
    identifier = request.data.get("email") or request.data.get("username")
    password = request.data.get("password")
    if not identifier or not password:
        return Response({"error": "Email/Username and password required"}, status=status.HTTP_400_BAD_REQUEST)

    user_obj = User.objects.filter(email__iexact=identifier).first()
    username = user_obj.username if user_obj else identifier
    user_auth = authenticate(username=username, password=password)
    if user_auth is None:
        return Response({"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

    refresh = RefreshToken.for_user(user_auth)
    return Response({
        "message": "Login successful",
        "user": UserSafeSerializer(user_auth).data,
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user(request):
    serializer = UserSafeSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)

# ------------------ FAMILY MEMBERS ------------------ #
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def family_members_list_create(request):
    if request.method == "GET":
        qs = FamilyMember.objects.filter(user=request.user).order_by("-id")
        ser = FamilyMemberSerializer(qs, many=True, context={"request": request})
        return Response(ser.data, status=status.HTTP_200_OK)

    ser = FamilyMemberSerializer(data=request.data, context={"request": request})
    if ser.is_valid():
        obj = ser.save(user=request.user)
        out = FamilyMemberSerializer(obj, context={"request": request}).data
        return Response(out, status=status.HTTP_201_CREATED)
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def family_member_detail(request, pk):
    try:
        member = FamilyMember.objects.get(pk=pk, user=request.user)
    except FamilyMember.DoesNotExist:
        return Response({"error": "Family member not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        ser = FamilyMemberSerializer(member, context={"request": request})
        return Response(ser.data, status=status.HTTP_200_OK)

    if request.method == "PUT":
        ser = FamilyMemberSerializer(member, data=request.data, partial=True, context={"request": request})
        if ser.is_valid():
            ser.save(user=request.user)
            return Response(ser.data, status=status.HTTP_200_OK)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE - Handle bidirectional deletion
    try:
        # Find the corresponding family user by username
        family_user = User.objects.get(username=member.name)
        
        # Find and delete the corresponding FamilyLink first
        family_link = FamilyLink.objects.filter(
            patient=request.user,  # The patient deleting the family member
            family_member=family_user  # The actual family user
        ).first()
        
        if family_link:
            print(f"🔗 Also deleting FamilyLink: {family_link}")
            family_link.delete()
            print(f"✅ Successfully deleted FamilyLink for {member.name}")
        else:
            print(f"ℹ️ No FamilyLink found for {member.name} -> {request.user.username}")
            
    except User.DoesNotExist:
        print(f"⚠️ No user found with username: {member.name} (might be manually added family member)")
    except Exception as e:
        print(f"❌ Error during bidirectional delete: {e}")
    
    # Delete the FamilyMember record
    member_name = member.name
    member.delete()
    
    return Response({
        "message": "Family member deleted successfully", 
        "deleted_member": member_name,
        "bidirectional": True  # Indicates both sides were cleaned up
    }, status=status.HTTP_204_NO_CONTENT)

# ------------------ MEMORIES ------------------ #
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def memories_list_create(request):
    if request.method == "GET":
        # Role-based memory access with optimized queries
        if is_patient(request.user):
            # Patients see their own memories
            memories = Memory.objects.filter(user=request.user).select_related('user').prefetch_related(
                'images', 'videos', 'voice_recordings', 'likes', 'members'
            ).annotate(
                images_count=Count('images'),
                videos_count=Count('videos'),
                recordings_count=Count('voice_recordings'),
                likes_count=Count('likes')
            ).order_by("-id")
            print(f"👤 Patient {request.user.username} accessing their own memories")
        elif is_family(request.user):
            # Family members see memories from all their connected patients
            connected_patients = FamilyLink.objects.filter(
                family_member=request.user, 
                status="APPROVED"
            ).values_list('patient', flat=True)
            
            memories = Memory.objects.filter(user__in=connected_patients).select_related('user').prefetch_related(
                'images', 'videos', 'voice_recordings', 'likes', 'members'
            ).annotate(
                images_count=Count('images'),
                videos_count=Count('videos'),
                recordings_count=Count('voice_recordings'),
                likes_count=Count('likes')
            ).order_by("-id")
            print(f"👪 Family member {request.user.username} accessing memories from {len(connected_patients)} connected patients")
        else:
            # Default: no access
            memories = Memory.objects.none()
            print(f"❌ User {request.user.username} has no role-based access to memories")
        
        serializer = MemorySerializer(memories, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    # POST: Allow both patients and family members to create memories
    patient_id = request.data.get('patient_id')  # Family members specify which patient
    
    if is_patient(request.user):
        # Patients create memories for themselves
        target_user = request.user
        print(f"👤 Patient {request.user.username} creating memory for themselves")
    elif is_family(request.user):
        # Family members create memories for connected patients
        if not patient_id:
            return Response(
                {"error": "Family members must specify patient_id when creating memories"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if family member has access to this patient
        if not can_access_patient_data(request.user, patient_id):
            return Response(
                {"error": "You don't have permission to create memories for this patient"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            target_user = User.objects.get(id=patient_id)
            print(f"👪 Family member {request.user.username} creating memory for patient {target_user.username}")
        except User.DoesNotExist:
            return Response(
                {"error": "Patient not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        return Response(
            {"error": "Only patients and family members can create memories"}, 
            status=status.HTTP_403_FORBIDDEN
        )

    # DEBUG: Enhanced logging for troubleshooting
    print("=== MEMORY POST DEBUG ===")
    print(f"Content-Type: {request.content_type}")
    print(f"request.data keys: {list(request.data.keys())}")
    print(f"request.FILES keys: {list(request.FILES.keys())}")
    print(f"Creating memory for: {target_user.username}")
    print(f"Created by: {request.user.username} (role: {getattr(request.user, 'role', 'patient')})")
    
    # Log each field with type info
    for key, value in request.data.items():
        print(f"  {key}: {repr(value)} (type: {type(value).__name__})")
    
    # Log file details if present
    file_obj = request.FILES.get("image")
    if file_obj:
        print(f"File found: {file_obj.name} (size: {file_obj.size}, content_type: {file_obj.content_type})")
    else:
        print("No file found in request.FILES['image']")
    print("=== END DEBUG ===")

    # Prepare data for serializer
    data = request.data.copy()

    # Handle Cloudinary upload if file is present
    if file_obj:
        try:
            print(f"📤 Uploading to Cloudinary: {file_obj.name}")
            # Debug: Print current cloudinary config
            print(f"🔧 Cloudinary config - Cloud: {cloudinary.config().cloud_name}, API Key: {cloudinary.config().api_key}")
            
            upload_res = cloudinary.uploader.upload(file_obj, folder="memories")
            secure_url = upload_res.get("secure_url") or upload_res.get("url")
            data["image_url"] = secure_url
            print(f"✅ Cloudinary upload success: {secure_url}")
        except Exception as e:
            print(f"❌ Cloudinary upload failed: {e}")
            return Response({"error": f"Cloudinary upload failed: {e}"}, status=status.HTTP_400_BAD_REQUEST)

    # Validate and create memory for the target user
    serializer = MemorySerializer(data=data, context={"request": request})
    if serializer.is_valid():
        instance = serializer.save(user=target_user)  # Save for target user, not request user
        out = MemorySerializer(instance, context={"request": request}).data
        print(f"✅ Memory created successfully: ID {instance.id} for {target_user.username}")
        return Response(out, status=status.HTTP_201_CREATED)
    else:
        print(f"❌ Memory validation errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def memory_detail(request, pk):
    try:
        # Role-based memory detail access
        if is_patient(request.user):
            # Patients can only access their own memories
            memory = Memory.objects.get(pk=pk, user=request.user)
        elif is_family(request.user):
            # Family members can access memories from connected patients
            connected_patients = FamilyLink.objects.filter(
                family_member=request.user, 
                status="APPROVED"
            ).values_list('patient', flat=True)
            
            memory = Memory.objects.get(pk=pk, user__in=connected_patients)
            print(f"👪 Family member {request.user.username} accessing memory from connected patient")
        else:
            raise Memory.DoesNotExist("No permission to access this memory")
            
    except Memory.DoesNotExist:
        return Response({"error": "Memory not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        serializer = MemorySerializer(memory, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    # PUT/DELETE: Allow both memory owner (patient) and connected family members
    if is_patient(request.user) and memory.user != request.user:
        return Response(
            {"error": "You can only modify your own memories"}, 
            status=status.HTTP_403_FORBIDDEN
        )
    elif is_family(request.user) and not can_access_patient_data(request.user, memory.user.id):
        return Response(
            {"error": "You don't have permission to modify this patient's memories"}, 
            status=status.HTTP_403_FORBIDDEN
        )

    # Handle file upload for updates
    data = request.data.copy()
    file_obj = request.FILES.get("image")

    if file_obj:
        try:
            upload_res = cloudinary.uploader.upload(file_obj, folder="memories")
            data["image_url"] = upload_res.get("secure_url") or upload_res.get("url")
        except Exception as e:
            return Response({"error": f"Cloudinary upload failed: {e}"}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == "PUT":
        serializer = MemorySerializer(memory, data=data, partial=True, context={"request": request})
        if serializer.is_valid():
            instance = serializer.save()  # Don't change the user - keep original owner
            print(f"✅ Memory updated: ID {instance.id} by {request.user.username}")
            return Response(MemorySerializer(instance, context={"request": request}).data, status=status.HTTP_200_OK)
        else:
            print(f"❌ Memory update errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE
    print(f"🗑️ Memory deleted: ID {memory.id} by {request.user.username}")
    memory.delete()
    return Response({"message": "Memory deleted"}, status=status.HTTP_204_NO_CONTENT)

# ------------------ ENHANCED MEMORY DETAIL VIEW ------------------ #

@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def memory_detail_enhanced(request, pk):
    """Enhanced memory detail with all media for the MemoryDetail component"""
    try:
        # Role-based memory detail access with all related data
        base_query = Memory.objects.select_related('user').prefetch_related(
            'images', 'videos', 'voice_recordings', 'tagged_people', 
            'event_tags', 'likes', 'comments__user', 'members'
        )
        
        if is_patient(request.user):
            # Patients can only access their own memories
            memory = base_query.get(pk=pk, user=request.user)
        elif is_family(request.user):
            # Family members can access memories from connected patients
            connected_patients = FamilyLink.objects.filter(
                family_member=request.user, 
                status="APPROVED"
            ).values_list('patient', flat=True)
            
            memory = base_query.get(pk=pk, user__in=connected_patients)
            print(f"👪 Family member {request.user.username} accessing enhanced memory from connected patient")
        else:
            raise Memory.DoesNotExist("No permission to access this memory")
            
    except Memory.DoesNotExist:
        return Response({"error": "Memory not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        # Use enhanced serializer with all related media
        serializer = MemoryDetailSerializer(memory, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    # PUT/DELETE: Allow both memory owner (patient) and connected family members
    if is_patient(request.user) and memory.user != request.user:
        return Response(
            {"error": "You can only modify your own memories"}, 
            status=status.HTTP_403_FORBIDDEN
        )
    elif is_family(request.user) and not can_access_patient_data(request.user, memory.user.id):
        return Response(
            {"error": "You don't have permission to modify this patient's memories"}, 
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == "PUT":
        serializer = MemoryDetailSerializer(memory, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            instance = serializer.save()
            return Response(MemoryDetailSerializer(instance, context={"request": request}).data, status=status.HTTP_200_OK)
        else:
            print(f"❌ Memory update errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE
    print(f"🗑️ Enhanced memory deleted: ID {memory.id} by {request.user.username}")
    memory.delete()
    return Response({"message": "Memory deleted"}, status=status.HTTP_204_NO_CONTENT)

# ------------------ MEMORY MEDIA MANAGEMENT VIEWS ------------------ #

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_memory_image(request, memory_id):
    """Add image to memory"""
    try:
        if is_patient(request.user):
            memory = Memory.objects.get(id=memory_id, user=request.user)
        elif is_family(request.user):
            connected_patients = FamilyLink.objects.filter(
                family_member=request.user, 
                status="APPROVED"
            ).values_list('patient', flat=True)
            memory = Memory.objects.get(id=memory_id, user__in=connected_patients)
        else:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except Memory.DoesNotExist:
        return Response({"error": "Memory not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # ✅ FIX: Don't copy request.data when it contains files
    data = {
        'memory': memory.id,
        'caption': request.data.get('caption', ''),
        'order': request.data.get('order', 0),
    }
    
    # Handle Cloudinary upload
    file_obj = request.FILES.get("image")
    if file_obj:
        try:
            print(f"📷 Uploading image to Cloudinary: {file_obj.name}")
            upload_res = cloudinary.uploader.upload(file_obj, folder="memory_images")
            data["image_url"] = upload_res.get("secure_url")
            print(f"✅ Image upload successful: {data['image_url']}")
        except Exception as e:
            print(f"❌ Cloudinary image upload failed: {e}")
            return Response({"error": f"Image upload failed: {e}"}, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({"error": "No image file provided"}, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = MemoryImageSerializer(data=data)
    if serializer.is_valid():
        image = serializer.save()
        return Response(MemoryImageSerializer(image).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_memory_video(request, memory_id):
    """Add video to memory"""
    try:
        if is_patient(request.user):
            memory = Memory.objects.get(id=memory_id, user=request.user)
        elif is_family(request.user):
            connected_patients = FamilyLink.objects.filter(
                family_member=request.user, 
                status="APPROVED"
            ).values_list('patient', flat=True)
            memory = Memory.objects.get(id=memory_id, user__in=connected_patients)
        else:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except Memory.DoesNotExist:
        return Response({"error": "Memory not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # ✅ FIX: Don't copy request.data when it contains files
    data = {
        'memory': memory.id,
        'caption': request.data.get('caption', ''),
        'order': request.data.get('order', 0),
    }
    
    # Handle Cloudinary upload for video
    file_obj = request.FILES.get("video")
    if file_obj:
        try:
            print(f"📹 Uploading video to Cloudinary: {file_obj.name}")
            upload_res = cloudinary.uploader.upload(file_obj, 
                                                  folder="memory_videos",
                                                  resource_type="video")
            data["video_url"] = upload_res.get("secure_url")
            
            # Extract duration if available
            if upload_res.get("duration"):
                minutes = int(upload_res["duration"] // 60)
                seconds = int(upload_res["duration"] % 60)
                data["duration"] = f"{minutes:02d}:{seconds:02d}"
                
            # Extract thumbnail URL if available
            if upload_res.get("secure_url"):
                # Cloudinary auto-generates thumbnail for videos
                thumbnail_url = upload_res["secure_url"].replace("/video/upload/", "/video/upload/c_thumb,w_300,h_200/")
                data["thumbnail_url"] = thumbnail_url
                
            print(f"✅ Video upload successful: {data['video_url']}")
        except Exception as e:
            print(f"❌ Cloudinary video upload failed: {e}")
            return Response({"error": f"Video upload failed: {e}"}, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({"error": "No video file provided"}, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = MemoryVideoSerializer(data=data)
    if serializer.is_valid():
        video = serializer.save()
        return Response(MemoryVideoSerializer(video).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_memory_voice_recording(request, memory_id):
    """Add voice recording to memory"""
    try:
        if is_patient(request.user):
            memory = Memory.objects.get(id=memory_id, user=request.user)
        elif is_family(request.user):
            connected_patients = FamilyLink.objects.filter(
                family_member=request.user, 
                status="APPROVED"
            ).values_list('patient', flat=True)
            memory = Memory.objects.get(id=memory_id, user__in=connected_patients)
        else:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except Memory.DoesNotExist:
        return Response({"error": "Memory not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # ✅ FIX: Don't copy request.data when it contains files
    data = {
        'memory': memory.id,
        'speaker_name': request.data.get('speaker_name', 'Unknown Speaker'),
        'speaker_relation': request.data.get('speaker_relation', ''),
        'order': request.data.get('order', 0),
    }
    
    # Handle Cloudinary upload for audio
    file_obj = request.FILES.get("audio")
    if file_obj:
        try:
            print(f"🎤 Uploading audio to Cloudinary: {file_obj.name}")
            upload_res = cloudinary.uploader.upload(file_obj, 
                                                  folder="memory_audio",
                                                  resource_type="video")  # Cloudinary uses "video" for audio files
            data["audio_url"] = upload_res.get("secure_url")
            
            # Extract duration if available
            if upload_res.get("duration"):
                minutes = int(upload_res["duration"] // 60)
                seconds = int(upload_res["duration"] % 60)
                data["duration"] = f"{minutes:02d}:{seconds:02d}"
                
            print(f"✅ Audio upload successful: {data['audio_url']}")
        except Exception as e:
            print(f"❌ Cloudinary audio upload failed: {e}")
            return Response({"error": f"Audio upload failed: {e}"}, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({"error": "No audio file provided"}, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = MemoryVoiceRecordingSerializer(data=data)
    if serializer.is_valid():
        recording = serializer.save()
        return Response(MemoryVoiceRecordingSerializer(recording).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_memory_people(request, memory_id):
    """Add people tags to memory"""
    try:
        if is_patient(request.user):
            memory = Memory.objects.get(id=memory_id, user=request.user)
        elif is_family(request.user):
            connected_patients = FamilyLink.objects.filter(
                family_member=request.user, 
                status="APPROVED"
            ).values_list('patient', flat=True)
            memory = Memory.objects.get(id=memory_id, user__in=connected_patients)
        else:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except Memory.DoesNotExist:
        return Response({"error": "Memory not found"}, status=status.HTTP_404_NOT_FOUND)
    
    people = request.data.get('people', [])
    created_people = []
    
    for person_data in people:
        person_data['memory'] = memory.id
        serializer = MemoryPersonSerializer(data=person_data)
        if serializer.is_valid():
            person = serializer.save()
            created_people.append(MemoryPersonSerializer(person).data)
    
    return Response(created_people, status=status.HTTP_201_CREATED)

@api_view(["POST"])
@permission_classes([IsAuthenticated])  
def add_memory_tags(request, memory_id):
    """Add event tags to memory"""
    try:
        if is_patient(request.user):
            memory = Memory.objects.get(id=memory_id, user=request.user)
        elif is_family(request.user):
            connected_patients = FamilyLink.objects.filter(
                family_member=request.user, 
                status="APPROVED"
            ).values_list('patient', flat=True)
            memory = Memory.objects.get(id=memory_id, user__in=connected_patients)
        else:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except Memory.DoesNotExist:
        return Response({"error": "Memory not found"}, status=status.HTTP_404_NOT_FOUND)
    
    tags = request.data.get('tags', [])
    created_tags = []
    
    for tag_data in tags:
        tag_data['memory'] = memory.id
        serializer = MemoryTagSerializer(data=tag_data)
        if serializer.is_valid():
            tag = serializer.save()
            created_tags.append(MemoryTagSerializer(tag).data)
    
    return Response(created_tags, status=status.HTTP_201_CREATED)

# ------------------ INDIVIDUAL MEDIA ITEM MANAGEMENT ------------------ #

@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def memory_image_detail(request, pk):
    """Get, update, or delete individual memory image"""
    try:
        image = MemoryImage.objects.select_related('memory').get(pk=pk)
        # Check permissions
        if is_patient(request.user) and image.memory.user != request.user:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        elif is_family(request.user) and not can_access_patient_data(request.user, image.memory.user.id):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except MemoryImage.DoesNotExist:
        return Response({"error": "Image not found"}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == "GET":
        return Response(MemoryImageSerializer(image).data, status=status.HTTP_200_OK)
    
    elif request.method == "PUT":
        serializer = MemoryImageSerializer(image, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == "DELETE":
        image.delete()
        return Response({"message": "Image deleted"}, status=status.HTTP_204_NO_CONTENT)

@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def memory_video_detail(request, pk):
    """Get, update, or delete individual memory video"""
    try:
        video = MemoryVideo.objects.select_related('memory').get(pk=pk)
        # Check permissions
        if is_patient(request.user) and video.memory.user != request.user:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        elif is_family(request.user) and not can_access_patient_data(request.user, video.memory.user.id):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except MemoryVideo.DoesNotExist:
        return Response({"error": "Video not found"}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == "GET":
        return Response(MemoryVideoSerializer(video).data, status=status.HTTP_200_OK)
    
    elif request.method == "PUT":
        serializer = MemoryVideoSerializer(video, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == "DELETE":
        video.delete()
        return Response({"message": "Video deleted"}, status=status.HTTP_204_NO_CONTENT)

@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def memory_voice_recording_detail(request, pk):
    """Get, update, or delete individual voice recording"""
    try:
        recording = MemoryVoiceRecording.objects.select_related('memory').get(pk=pk)
        # Check permissions
        if is_patient(request.user) and recording.memory.user != request.user:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        elif is_family(request.user) and not can_access_patient_data(request.user, recording.memory.user.id):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except MemoryVoiceRecording.DoesNotExist:
        return Response({"error": "Recording not found"}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == "GET":
        return Response(MemoryVoiceRecordingSerializer(recording).data, status=status.HTTP_200_OK)
    
    elif request.method == "PUT":
        serializer = MemoryVoiceRecordingSerializer(recording, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == "DELETE":
        recording.delete()
        return Response({"message": "Recording deleted"}, status=status.HTTP_204_NO_CONTENT)

@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def memory_person_detail(request, pk):
    """Get, update, or delete individual memory person tag"""
    try:
        person = MemoryPerson.objects.select_related('memory').get(pk=pk)
        # Check permissions
        if is_patient(request.user) and person.memory.user != request.user:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        elif is_family(request.user) and not can_access_patient_data(request.user, person.memory.user.id):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except MemoryPerson.DoesNotExist:
        return Response({"error": "Person not found"}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == "GET":
        return Response(MemoryPersonSerializer(person).data, status=status.HTTP_200_OK)
    
    elif request.method == "PUT":
        serializer = MemoryPersonSerializer(person, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == "DELETE":
        person.delete()
        return Response({"message": "Person tag deleted"}, status=status.HTTP_204_NO_CONTENT)

@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def memory_tag_detail(request, pk):
    """Get, update, or delete individual memory tag"""
    try:
        tag = MemoryTag.objects.select_related('memory').get(pk=pk)
        # Check permissions
        if is_patient(request.user) and tag.memory.user != request.user:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        elif is_family(request.user) and not can_access_patient_data(request.user, tag.memory.user.id):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except MemoryTag.DoesNotExist:
        return Response({"error": "Tag not found"}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == "GET":
        return Response(MemoryTagSerializer(tag).data, status=status.HTTP_200_OK)
    
    elif request.method == "PUT":
        serializer = MemoryTagSerializer(tag, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == "DELETE":
        tag.delete()
        return Response({"message": "Tag deleted"}, status=status.HTTP_204_NO_CONTENT)

@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def memory_comment_detail(request, pk):
    """Get, update, or delete individual memory comment"""
    try:
        comment = MemoryComment.objects.select_related('memory', 'user').get(pk=pk)
        # Check permissions - only comment author or memory owner can edit
        if comment.user != request.user and comment.memory.user != request.user:
            if is_family(request.user) and not can_access_patient_data(request.user, comment.memory.user.id):
                return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except MemoryComment.DoesNotExist:
        return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == "GET":
        return Response(MemoryCommentSerializer(comment).data, status=status.HTTP_200_OK)
    
    elif request.method == "PUT":
        # Only comment author can edit content
        if comment.user != request.user:
            return Response({"error": "Only comment author can edit"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = MemoryCommentSerializer(comment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == "DELETE":
        # Comment author or memory owner can delete
        if comment.user != request.user and comment.memory.user != request.user:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        
        comment.delete()
        return Response({"message": "Comment deleted"}, status=status.HTTP_204_NO_CONTENT)

# ------------------ MEMORY INTERACTION VIEWS ------------------ #

@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
def toggle_memory_like(request, memory_id):
    """Toggle like/unlike for a memory"""
    try:
        # Check if user can access this memory
        if is_patient(request.user):
            memory = Memory.objects.get(id=memory_id, user=request.user)
        elif is_family(request.user):
            connected_patients = FamilyLink.objects.filter(
                family_member=request.user, 
                status="APPROVED"
            ).values_list('patient', flat=True)
            memory = Memory.objects.get(id=memory_id, user__in=connected_patients)
        else:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except Memory.DoesNotExist:
        return Response({"error": "Memory not found"}, status=status.HTTP_404_NOT_FOUND)
    
    like, created = MemoryLike.objects.get_or_create(
        memory=memory,
        user=request.user
    )
    
    if request.method == "POST":
        if not created:
            return Response({"message": "Already liked", "liked": True}, status=status.HTTP_200_OK)
        return Response({"message": "Memory liked", "liked": True}, status=status.HTTP_201_CREATED)
    
    elif request.method == "DELETE":
        if like:
            like.delete()
            return Response({"message": "Memory unliked", "liked": False}, status=status.HTTP_200_OK)
        return Response({"message": "Not liked", "liked": False}, status=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_memory_comment(request, memory_id):
    """Add comment to memory"""
    try:
        # Check if user can access this memory
        if is_patient(request.user):
            memory = Memory.objects.get(id=memory_id, user=request.user)
        elif is_family(request.user):
            connected_patients = FamilyLink.objects.filter(
                family_member=request.user, 
                status="APPROVED"
            ).values_list('patient', flat=True)
            memory = Memory.objects.get(id=memory_id, user__in=connected_patients)
        else:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except Memory.DoesNotExist:
        return Response({"error": "Memory not found"}, status=status.HTTP_404_NOT_FOUND)
    
    data = request.data.copy()
    data['memory'] = memory.id
    data['user'] = request.user.id
    
    serializer = MemoryCommentSerializer(data=data)
    if serializer.is_valid():
        comment = serializer.save()
        return Response(MemoryCommentSerializer(comment, context={"request": request}).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ------------------ ADDITIONAL HELPER ENDPOINTS ------------------ #

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_memory_media(request, memory_id):
    """Get all media for a specific memory"""
    try:
        if is_patient(request.user):
            memory = Memory.objects.get(id=memory_id, user=request.user)
        elif is_family(request.user):
            connected_patients = FamilyLink.objects.filter(
                family_member=request.user, 
                status="APPROVED"
            ).values_list('patient', flat=True)
            memory = Memory.objects.get(id=memory_id, user__in=connected_patients)
        else:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except Memory.DoesNotExist:
        return Response({"error": "Memory not found"}, status=status.HTTP_404_NOT_FOUND)
    
    data = {
        "images": MemoryImageSerializer(memory.images.all(), many=True).data,
        "videos": MemoryVideoSerializer(memory.videos.all(), many=True).data,
        "voice_recordings": MemoryVoiceRecordingSerializer(memory.voice_recordings.all(), many=True).data,
        "people": MemoryPersonSerializer(memory.tagged_people.all(), many=True).data,
        "tags": MemoryTagSerializer(memory.event_tags.all(), many=True).data,
    }
    
    return Response(data, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_memory_interactions(request, memory_id):
    """Get all interactions (likes, comments) for a specific memory"""
    try:
        if is_patient(request.user):
            memory = Memory.objects.get(id=memory_id, user=request.user)
        elif is_family(request.user):
            connected_patients = FamilyLink.objects.filter(
                family_member=request.user, 
                status="APPROVED"
            ).values_list('patient', flat=True)
            memory = Memory.objects.get(id=memory_id, user__in=connected_patients)
        else:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except Memory.DoesNotExist:
        return Response({"error": "Memory not found"}, status=status.HTTP_404_NOT_FOUND)
    
    data = {
        "likes": MemoryLikeSerializer(memory.likes.all(), many=True).data,
        "comments": MemoryCommentSerializer(memory.comments.all(), many=True).data,
        "likes_count": memory.likes.count(),
        "comments_count": memory.comments.count(),
        "is_liked_by_user": memory.likes.filter(user=request.user).exists(),
    }
    
    return Response(data, status=status.HTTP_200_OK)

# ------------------ FAMILY LINKS / CODES ------------------ #
@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def code_endpoint(request):
    if not is_patient(request.user):
        return Response({"detail": "Only patients can manage a code."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        code_obj = getattr(request.user, "connect_code", None)
        if not code_obj or not code_obj.is_valid():
            return Response({"detail": "No active code."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PatientConnectCodeSerializer(code_obj).data, status=status.HTTP_200_OK)

    code_obj = getattr(request.user, "connect_code", None)
    if code_obj:
        code_obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_connect_code(request):
    if not is_patient(request.user):
        return Response({"detail": "Only patients can generate a code."}, status=status.HTTP_403_FORBIDDEN)
    code_obj = getattr(request.user, "connect_code", None)
    if not code_obj:
        code_obj = PatientConnectCode(patient=request.user)
    code_obj.code = PatientConnectCode.generate_code()
    code_obj.expires_at = timezone.now() + timedelta(minutes=30)
    code_obj.save()
    return Response(PatientConnectCodeSerializer(code_obj).data, status=status.HTTP_201_CREATED)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def connect_with_code(request):
    if not is_family(request.user):
        return Response({"detail": "Only family members can connect with a code."}, status=status.HTTP_403_FORBIDDEN)
    code = (request.data.get("code") or "").strip().upper()
    if not code:
        return Response({"detail": "Code is required."}, status=status.HTTP_400_BAD_REQUEST)

    code_obj = PatientConnectCode.objects.filter(code=code).first()
    if not code_obj or not code_obj.is_valid():
        return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)

    patient = code_obj.patient
    
    # Create or update the FamilyLink (for family user's perspective)
    link, created = FamilyLink.objects.get_or_create(
        patient=patient,
        family_member=request.user,
        defaults={"status": "APPROVED"},
    )
    if not created and link.status != "APPROVED":
        link.status = "APPROVED"
        link.save(update_fields=["status"])

    # CRITICAL: Also create a FamilyMember record for the patient's family list
    # This ensures bidirectional visibility - patient can see connected family members
    family_member, fm_created = FamilyMember.objects.get_or_create(
        user=patient,  # The patient owns this family member record
        name=request.user.username,  # Use the connecting user's username as name
        defaults={
            "relation": "Family Member",  # Default relation
        }
    )
    
    if fm_created:
        print(f"✅ Created FamilyMember record: {request.user.username} for patient {patient.username}")
    else:
        print(f"ℹ️ FamilyMember record already exists: {request.user.username} for patient {patient.username}")

    code_obj.delete()  # one-time use
    
    return Response({
        "message": "Connected successfully", 
        "patient": {
            "id": patient.id, 
            "username": patient.username
        },
        "bidirectional": True  # Indicate that both sides can see the connection
    }, status=status.HTTP_201_CREATED)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_patients(request):
    if not is_family(request.user):
        return Response({"detail": "Only family users."}, status=status.HTTP_403_FORBIDDEN)
    links = FamilyLink.objects.filter(family_member=request.user, status="APPROVED").select_related("patient").order_by("-id")
    data = [{"id": l.patient.id, "username": l.patient.username, "name": getattr(l.patient, "full_name", l.patient.username), "avatar": None, "relation": l.relation or ""} for l in links]
    return Response(data, status=status.HTTP_200_OK)

# ------------------ MEMORY NAVIGATION HELPER ENDPOINTS ------------------ #

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_memory_navigation(request, memory_id):
    """Get previous and next memory for navigation"""
    try:
        if is_patient(request.user):
            current_memory = Memory.objects.get(id=memory_id, user=request.user)
            all_memories = Memory.objects.filter(user=request.user).order_by('-created_at')
        elif is_family(request.user):
            connected_patients = FamilyLink.objects.filter(
                family_member=request.user, 
                status="APPROVED"
            ).values_list('patient', flat=True)
            current_memory = Memory.objects.get(id=memory_id, user__in=connected_patients)
            all_memories = Memory.objects.filter(user__in=connected_patients).order_by('-created_at')
        else:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except Memory.DoesNotExist:
        return Response({"error": "Memory not found"}, status=status.HTTP_404_NOT_FOUND)
    
    memory_ids = list(all_memories.values_list('id', flat=True))
    current_index = memory_ids.index(memory_id) if memory_id in memory_ids else -1
    
    prev_memory = None
    next_memory = None
    
    if current_index > 0:
        prev_memory_obj = all_memories.filter(id=memory_ids[current_index - 1]).first()
        if prev_memory_obj:
            prev_memory = {
                "id": prev_memory_obj.id,
                "title": prev_memory_obj.title,
                "date": prev_memory_obj.date
            }
    
    if current_index < len(memory_ids) - 1 and current_index != -1:
        next_memory_obj = all_memories.filter(id=memory_ids[current_index + 1]).first()
        if next_memory_obj:
            next_memory = {
                "id": next_memory_obj.id,
                "title": next_memory_obj.title,
                "date": next_memory_obj.date
            }
    
    return Response({
        "current_position": current_index + 1,
        "total_memories": len(memory_ids),
        "previous_memory": prev_memory,
        "next_memory": next_memory
    }, status=status.HTTP_200_OK)

# ------------------ BULK OPERATIONS ------------------ #

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_add_memory_media(request, memory_id):
    """Bulk add multiple media items to a memory"""
    try:
        if is_patient(request.user):
            memory = Memory.objects.get(id=memory_id, user=request.user)
        elif is_family(request.user):
            connected_patients = FamilyLink.objects.filter(
                family_member=request.user, 
                status="APPROVED"
            ).values_list('patient', flat=True)
            memory = Memory.objects.get(id=memory_id, user__in=connected_patients)
        else:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except Memory.DoesNotExist:
        return Response({"error": "Memory not found"}, status=status.HTTP_404_NOT_FOUND)
    
    results = {
        "images": [],
        "videos": [],
        "audio": [],
        "errors": []
    }
    
    # Handle multiple image uploads
    if 'images' in request.FILES:
        images = request.FILES.getlist('images')
        for i, image_file in enumerate(images):
            try:
                upload_res = cloudinary.uploader.upload(image_file, folder="memory_images")
                image_data = {
                    'memory': memory.id,
                    'image_url': upload_res.get("secure_url"),
                    'order': i
                }
                serializer = MemoryImageSerializer(data=image_data)
                if serializer.is_valid():
                    image_obj = serializer.save()
                    results["images"].append(MemoryImageSerializer(image_obj).data)
                else:
                    results["errors"].append(f"Image {i+1}: {serializer.errors}")
            except Exception as e:
                results["errors"].append(f"Image {i+1} upload failed: {str(e)}")
    
    # Handle multiple video uploads
    if 'videos' in request.FILES:
        videos = request.FILES.getlist('videos')
        for i, video_file in enumerate(videos):
            try:
                upload_res = cloudinary.uploader.upload(
                    video_file, 
                    folder="memory_videos",
                    resource_type="video"
                )
                video_data = {
                    'memory': memory.id,
                    'video_url': upload_res.get("secure_url"),
                    'order': i
                }
                serializer = MemoryVideoSerializer(data=video_data)
                if serializer.is_valid():
                    video_obj = serializer.save()
                    results["videos"].append(MemoryVideoSerializer(video_obj).data)
                else:
                    results["errors"].append(f"Video {i+1}: {serializer.errors}")
            except Exception as e:
                results["errors"].append(f"Video {i+1} upload failed: {str(e)}")
    
    return Response(results, status=status.HTTP_201_CREATED)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def bulk_delete_memory_media(request, memory_id):
    """Bulk delete multiple media items from a memory"""
    try:
        if is_patient(request.user):
            memory = Memory.objects.get(id=memory_id, user=request.user)
        elif is_family(request.user):
            connected_patients = FamilyLink.objects.filter(
                family_member=request.user, 
                status="APPROVED"
            ).values_list('patient', flat=True)
            memory = Memory.objects.get(id=memory_id, user__in=connected_patients)
        else:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    except Memory.DoesNotExist:
        return Response({"error": "Memory not found"}, status=status.HTTP_404_NOT_FOUND)
    
    image_ids = request.data.get('image_ids', [])
    video_ids = request.data.get('video_ids', [])
    recording_ids = request.data.get('recording_ids', [])
    
    deleted = {
        "images": 0,
        "videos": 0,
        "recordings": 0
    }
    
    if image_ids:
        deleted_images = MemoryImage.objects.filter(
            id__in=image_ids, 
            memory=memory
        ).delete()
        deleted["images"] = deleted_images[0]
    
    if video_ids:
        deleted_videos = MemoryVideo.objects.filter(
            id__in=video_ids, 
            memory=memory
        ).delete()
        deleted["videos"] = deleted_videos[0]
    
    if recording_ids:
        deleted_recordings = MemoryVoiceRecording.objects.filter(
            id__in=recording_ids, 
            memory=memory
        ).delete()
        deleted["recordings"] = deleted_recordings[0]
    
    return Response({
        "message": "Media deleted successfully",
        "deleted": deleted
    }, status=status.HTTP_200_OK)
