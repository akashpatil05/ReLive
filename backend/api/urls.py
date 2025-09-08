from django.urls import path
from .views import register_user, login_user, MemoryListCreateView

urlpatterns = [
    path('auth/register/', register_user, name='register'),
    path('auth/login/', login_user, name='login'),
    path('memories/', MemoryListCreateView.as_view(), name='memory-list-create'),
]