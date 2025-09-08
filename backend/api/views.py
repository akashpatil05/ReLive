from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import generics
import json

from .models import Memory
from .serializers import UserSerializer, MemorySerializer


# --------------------
# User Registration
# --------------------
@csrf_exempt
def register_user(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get("username")
            email = data.get("email")
            password = data.get("password")

            if not username or not email or not password:
                return JsonResponse({"error": "All fields are required"}, status=400)

            if User.objects.filter(username=username).exists():
                return JsonResponse({"error": "Username already exists"}, status=400)

            user = User.objects.create_user(username=username, email=email, password=password)
            return JsonResponse({"message": "User registered successfully", "username": user.username}, status=201)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Invalid request"}, status=400)


# --------------------
# User Login
# --------------------
@csrf_exempt
def login_user(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get("username")
            password = data.get("password")

            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                return JsonResponse({"message": "Login successful", "username": user.username}, status=200)
            else:
                return JsonResponse({"error": "Invalid credentials"}, status=400)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Invalid request"}, status=400)


# --------------------
# Memories (List + Create)
# --------------------
class MemoryListCreateView(generics.ListCreateAPIView):
    queryset = Memory.objects.all().order_by('-created_at')
    serializer_class = MemorySerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)