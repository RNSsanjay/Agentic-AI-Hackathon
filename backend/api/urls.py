from django.urls import path
from . import views
from .Agent import ResumeAnalysisView

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', views.register_user, name='register'),
    path('auth/login/', views.login_user, name='login'),
    
    # Resume analysis endpoints
    path('analyze/resume/', ResumeAnalysisView.as_view(), name='analyze_resume'),
    
    # Health check endpoint
]