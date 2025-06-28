from django.urls import path
from . import views, scrap
from .Agent import ResumeAnalysisView

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', views.register_user, name='register'),
    path('auth/login/', views.login_user, name='login'),
    path('auth/forgot-password/', views.forgot_password, name='forgot_password'),
    path('auth/reset-password/', views.reset_password, name='reset_password'),
    path('auth/change-password/', views.change_password, name='change_password'),
    
    # Resume analysis endpoints
    path('analyze/resume/', ResumeAnalysisView.as_view(), name='analyze_resume'),
    
    # Internships endpoints
    path('internships/', views.get_internships, name='get_internships'),
    path('dashboard/stats/', views.get_dashboard_stats, name='get_dashboard_stats'),
    path('dashboard/update-cache/', views.update_dashboard_cache, name='update_dashboard_cache'),
    path('activity/', views.get_recent_activity, name='get_recent_activity'),
    
    # Scraping endpoints
    path('scrape/internships/', scrap.scrape_internships, name='scrape_internships'),
    path('scrape/task/<str:task_id>/', scrap.get_scraping_task_status, name='get_scraping_task_status'),
    path('scrape/clean-expired/', scrap.clean_expired_internships, name='clean_expired_internships'),
    path('scrape/stats/', scrap.get_scraping_stats, name='get_scraping_stats'),
    
    # User scraping preferences
    path('scraping/preferences/', views.user_scraping_preferences, name='user_scraping_preferences'),
    path('scraping/user-scrape/', views.scrape_with_user_preferences, name='scrape_with_user_preferences'),
    path('scraping/platform-stats/', views.get_platform_statistics, name='get_platform_statistics'),
    
    # Analysis history endpoints
    path('analysis/history/', views.get_analysis_history, name='get_analysis_history'),
    path('analysis/statistics/', views.get_analysis_statistics, name='get_analysis_statistics'),
    path('analysis/<str:analysis_id>/', views.get_analysis_by_id, name='get_analysis_by_id'),
    path('analysis/<str:analysis_id>/delete/', views.delete_analysis, name='delete_analysis'),
   
    # Health check endpoints
    path('test/mongodb/', views.test_mongodb_connection, name='test_mongodb_connection'),
    path('health/', scrap.health_check, name='scraper_health_check'),

    # Profile endpoints
    path('profile/', views.user_profile, name='user_profile'),
    path('profile/avatar/', views.upload_avatar, name='upload_avatar'),
    path('profile/stats/', views.profile_stats, name='profile_stats'),
]