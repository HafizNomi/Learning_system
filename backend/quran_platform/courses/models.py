from django.db import models
import uuid

from .youtube import embed_url, extract_video_id, thumbnail_url, validate_youtube_url, watch_url

class Course(models.Model):
    """Available courses"""
    CATEGORY_CHOICES = [
        ('quran', 'Quran Recitation'),
        ('quran_memorization', 'Quran Memorization'),
        ('tajweed', 'Tajweed Rules'),
        ('ai', 'Artificial Intelligence'),
        ('blockchain', 'Blockchain Basics'),
        ('programming', 'Programming for Kids'),
        ('web_dev', 'Web Development'),
    ]
    
    LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='beginner')
    price_per_month = models.DecimalField(max_digits=10, decimal_places=2, default=50.00)
    duration_minutes = models.IntegerField(default=45)  # Each class duration
    classes_per_week = models.IntegerField(default=3)   # How many classes per week
    thumbnail = models.ImageField(upload_to='courses/', blank=True, null=True)
    syllabus = models.TextField(blank=True)  # What will be taught
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Without a deterministic order, paginated pages can repeat or skip
        # courses. Matches the ordering staff see in the admin.
        ordering = ['category', 'title']

    def __str__(self):
        return f"{self.title} ({self.level})"


class CourseLesson(models.Model):
    """
    A recorded lesson, hosted on YouTube.

    Only the link is stored. Video files are far too large to keep on our own
    server, and YouTube serves them worldwide for free - which matters when
    students are spread across timezones and connection speeds.

    Set the videos to **Unlisted** on YouTube, not Public: an unlisted video
    does not appear in search or on the channel, so only people given the link
    can reach it. `is_preview` then decides who is given that link here.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='lessons')

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    youtube_url = models.URLField(
        validators=[validate_youtube_url],
        help_text='Paste any YouTube link - the share link, the address bar, or an embed URL.',
    )

    # Lessons are shown in this order, lowest first.
    order = models.PositiveIntegerField(
        default=0,
        help_text='Lower numbers appear first.',
    )
    duration_minutes = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Length of the video, shown to students before they start it.',
    )

    is_published = models.BooleanField(
        default=True,
        help_text='Untick to hide this lesson from students while you prepare it.',
    )
    is_preview = models.BooleanField(
        default=False,
        help_text='Tick to let anyone watch this lesson, including visitors who have not enrolled.',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'created_at']
        indexes = [models.Index(fields=['course', 'order'])]

    def __str__(self):
        return f'{self.course.title} - {self.title}'

    @property
    def video_id(self):
        """The 11-character YouTube id, or None if the link is unusable."""
        return extract_video_id(self.youtube_url)

    @property
    def embed_url(self):
        return embed_url(self.video_id)

    @property
    def watch_url(self):
        return watch_url(self.video_id)

    @property
    def thumbnail_url(self):
        return thumbnail_url(self.video_id)