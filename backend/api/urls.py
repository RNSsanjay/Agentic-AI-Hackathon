from django.urls import path
from . import views
from .Agent import ResumeAnalysisView

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', views.register_user, name='register'),
    path('auth/login/', views.login_user, name='login'),
    
    # Resume analysis endpoints
    path('analyze/resume/', ResumeAnalysisView.as_view(), name='analyze_resume'),
    
    # Internships endpoints
    path('internships/', views.get_internships, name='get_internships'),
    path('dashboard/stats/', views.get_dashboard_stats, name='get_dashboard_stats'),
    path('dashboard/update-cache/', views.update_dashboard_cache, name='update_dashboard_cache'),
    path('activity/', views.get_recent_activity, name='get_recent_activity'),
    
    # Analysis history endpoints
    path('analysis/history/', views.get_analysis_history, name='get_analysis_history'),
    path('analysis/<str:analysis_id>/', views.get_analysis_by_id, name='get_analysis_by_id'),
    path('analysis/<str:analysis_id>/delete/', views.delete_analysis, name='delete_analysis'),
    path('analysis/statistics/', views.get_analysis_statistics, name='get_analysis_statistics'),
   
      # Health check endpoint
    path('test/mongodb/', views.test_mongodb_connection, name='test_mongodb_connection'),
]