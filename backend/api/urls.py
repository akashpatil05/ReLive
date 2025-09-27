# api/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Auth endpoints
    path("auth/register/", views.register_user, name="register_user"),
    path("auth/login/", views.login_user, name="login_user"),
    path("auth/me/", views.get_user, name="get_user"),
    
    # Family members
    path("family-members/", views.family_members_list_create, name="family_members_list_create"),
    path("family-members/<int:pk>/", views.family_member_detail, name="family_member_detail"),
    
    # Memories - Standard endpoints
    path("memories/", views.memories_list_create, name="memories_list_create"),
    path("memories/<int:pk>/", views.memory_detail, name="memory_detail"),
    
    # ✅ ADD THIS - Enhanced memory detail with all media
    path("memories/<int:pk>/detail/", views.memory_detail_enhanced, name="memory_detail_enhanced"),
    
    # ✅ ADD THESE - Memory media management
    path("memories/<int:memory_id>/images/", views.add_memory_image, name="add_memory_image"),
    path("memories/<int:memory_id>/videos/", views.add_memory_video, name="add_memory_video"),
    path("memories/<int:memory_id>/recordings/", views.add_memory_voice_recording, name="add_memory_voice_recording"),
    path("memories/<int:memory_id>/people/", views.add_memory_people, name="add_memory_people"),
    path("memories/<int:memory_id>/tags/", views.add_memory_tags, name="add_memory_tags"),
    
    # ✅ ADD THESE - Memory interactions
    path("memories/<int:memory_id>/like/", views.toggle_memory_like, name="toggle_memory_like"),
    path("memories/<int:memory_id>/comments/", views.add_memory_comment, name="add_memory_comment"),
    path("memories/<int:memory_id>/navigation/", views.get_memory_navigation, name="get_memory_navigation"),
    
    # Individual media item management (optional)
    path("memory-images/<int:pk>/", views.memory_image_detail, name="memory_image_detail"),
    path("memory-videos/<int:pk>/", views.memory_video_detail, name="memory_video_detail"),
    path("memory-recordings/<int:pk>/", views.memory_voice_recording_detail, name="memory_voice_recording_detail"),
    path("memory-people/<int:pk>/", views.memory_person_detail, name="memory_person_detail"),
    path("memory-tags/<int:pk>/", views.memory_tag_detail, name="memory_tag_detail"),
    path("memory-comments/<int:pk>/", views.memory_comment_detail, name="memory_comment_detail"),
    
    # Helper endpoints
    path("memories/<int:memory_id>/media/", views.get_memory_media, name="get_memory_media"),
    path("memories/<int:memory_id>/interactions/", views.get_memory_interactions, name="get_memory_interactions"),
    
    # Family links and codes
    path("family-links/code/", views.code_endpoint, name="code_endpoint"),
    path("family-links/create-code/", views.create_connect_code, name="create_connect_code"),
    path("family-links/connect/", views.connect_with_code, name="connect_with_code"),
    path("family-links/my-patients/", views.my_patients, name="my_patients"),
]
