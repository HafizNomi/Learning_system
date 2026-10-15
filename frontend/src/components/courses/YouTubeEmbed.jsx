import { useState } from 'react';
import { Play, Lock } from 'lucide-react';

/**
 * A YouTube video, loaded only when the student asks for it.
 *
 * The thumbnail is shown first and the iframe is created on click. YouTube's
 * player pulls in roughly a megabyte of scripts, so embedding ten lessons
 * directly would make the course page crawl on a phone - which is how most of
 * our students will open it. Nothing reaches Google until someone presses play.
 */
function YouTubeEmbed({ embedUrl, thumbnailUrl, title, isLocked = false }) {
  const [playing, setPlaying] = useState(false);

  const poster = thumbnailUrl ? (
    <img
      src={thumbnailUrl}
      alt=""
      loading="lazy"
      className="absolute inset-0 h-full w-full object-cover"
    />
  ) : null;

  if (isLocked || !embedUrl) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-900">
        {poster}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/70 text-center text-white">
          <Lock className="mb-2 h-7 w-7" />
          <p className="text-sm font-medium">Enrol to watch this lesson</p>
        </div>
      </div>
    );
  }

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={title ? `Play ${title}` : 'Play video'}
        className="group relative aspect-video w-full overflow-hidden rounded-lg bg-gray-900"
      >
        {poster}
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/40">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg transition group-hover:scale-110">
            <Play className="ml-0.5 h-6 w-6 fill-gray-900 text-gray-900" />
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe
        src={`${embedUrl}&autoplay=1`}
        title={title || 'Lesson video'}
        className="h-full w-full"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

export default YouTubeEmbed;
