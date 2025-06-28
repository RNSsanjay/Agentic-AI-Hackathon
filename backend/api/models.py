from django.db import models
from django.contrib.auth.models import User

# Create your models here.
# Note: We're using MongoDB directly, so Django models are not used for user data

class UserScrapingPreferences(models.Model):
    """User preferences for scraping platforms"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='scraping_preferences')
    
    # Platform preferences
    enable_indeed = models.BooleanField(default=True)
    enable_linkedin = models.BooleanField(default=True)
    enable_naukri = models.BooleanField(default=True)
    enable_internshala = models.BooleanField(default=True)
    enable_letsintern = models.BooleanField(default=True)
    
    # Scraping preferences
    max_pages_per_platform = models.IntegerField(default=2)
    preferred_locations = models.JSONField(default=list, help_text="List of preferred locations")
    preferred_domains = models.JSONField(default=list, help_text="List of preferred domains")
    
    # Auto-scraping settings
    auto_scrape_enabled = models.BooleanField(default=False)
    scrape_frequency_hours = models.IntegerField(default=24, help_text="Hours between auto-scrapes")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "User Scraping Preferences"
        verbose_name_plural = "User Scraping Preferences"
    
    def __str__(self):
        return f"Scraping preferences for {self.user.username}"
    
    def get_enabled_platforms(self):
        """Get list of enabled platforms for this user"""
        platforms = []
        if self.enable_indeed:
            platforms.append('indeed')
        if self.enable_linkedin:
            platforms.append('linkedin')
        if self.enable_naukri:
            platforms.append('naukri')
        if self.enable_internshala:
            platforms.append('internshala')
        if self.enable_letsintern:
            platforms.append('letsintern')
        return platforms
    
    @classmethod
    def get_user_preferences(cls, user):
        """Get or create user preferences"""
        preferences, created = cls.objects.get_or_create(user=user)
        return preferences
