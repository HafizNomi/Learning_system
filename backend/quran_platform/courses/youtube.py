"""
Turning a YouTube link into the pieces the portal needs.

Videos are hosted on YouTube rather than on our own server: a recorded class is
hundreds of megabytes, and serving that to every student would cost far more in
bandwidth and storage than the whole platform earns. We store the 11-character
video id and let Google do the hosting.

Staff paste whatever link YouTube gave them - the share link, the address bar,
the mobile app - so every common form is accepted.
"""

import re
from urllib.parse import parse_qs, urlparse

from django.core.exceptions import ValidationError

# A YouTube video id is always 11 characters of base64url alphabet.
VIDEO_ID = re.compile(r'^[A-Za-z0-9_-]{11}$')

# Hosts we accept a link from. Anything else is almost certainly a mistake.
ALLOWED_HOSTS = {
    'youtube.com', 'www.youtube.com', 'm.youtube.com',
    'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com',
    'youtu.be', 'www.youtu.be',
}

# Paths that carry the id as the last segment, e.g. /embed/<id>, /shorts/<id>
PATH_PREFIXES = ('embed', 'shorts', 'live', 'v')


def extract_video_id(url):
    """
    Pull the video id out of a YouTube URL, or return None.

    Handles the share link (youtu.be/ID), the watch page (/watch?v=ID),
    embeds (/embed/ID), shorts (/shorts/ID) and live (/live/ID), with or
    without extra query parameters such as ?t=90 or &list=...
    """
    if not url or not isinstance(url, str):
        return None

    candidate = url.strip()
    if not candidate:
        return None

    # Tolerate a link pasted without its scheme, e.g. "youtu.be/dQw4w9WgXcQ".
    if '//' not in candidate:
        candidate = f'https://{candidate}'

    try:
        parsed = urlparse(candidate)
    except ValueError:
        return None

    host = (parsed.hostname or '').lower()
    if host not in ALLOWED_HOSTS:
        return None

    # youtu.be/<id> - the id is the whole path.
    if host.endswith('youtu.be'):
        return _clean(parsed.path.lstrip('/').split('/')[0])

    segments = [segment for segment in parsed.path.split('/') if segment]

    # /watch?v=<id>
    if segments and segments[0] == 'watch':
        values = parse_qs(parsed.query).get('v')
        return _clean(values[0]) if values else None

    # /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
    if len(segments) >= 2 and segments[0] in PATH_PREFIXES:
        return _clean(segments[1])

    return None


def _clean(value):
    """Return `value` if it looks like a video id, else None."""
    value = (value or '').strip()
    return value if VIDEO_ID.match(value) else None


def embed_url(video_id):
    """
    The URL to put in an iframe.

    youtube-nocookie.com is YouTube's privacy-enhanced domain: it does not set
    tracking cookies until the viewer actually plays something. On a platform
    used by children that is the right default.
    """
    if not video_id:
        return None
    return f'https://www.youtube-nocookie.com/embed/{video_id}?rel=0&modestbranding=1'


def watch_url(video_id):
    """The ordinary link, for opening the video on YouTube itself."""
    return f'https://www.youtube.com/watch?v={video_id}' if video_id else None


def thumbnail_url(video_id):
    """
    Poster image for the video.

    `hqdefault` exists for every video; the higher-resolution names do not, so
    using them would leave broken images on some lessons.
    """
    if not video_id:
        return None
    return f'https://i.ytimg.com/vi/{video_id}/hqdefault.jpg'


def validate_youtube_url(value):
    """Field validator: reject anything we cannot get a video id out of."""
    if value in (None, ''):
        return
    if extract_video_id(value) is None:
        raise ValidationError(
            'Enter a valid YouTube link, for example '
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/dQw4w9WgXcQ'
        )
