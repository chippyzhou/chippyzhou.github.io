import { useEffect, useMemo, useRef, useState } from "react";
import type { PrivateMusicTrack } from "./privateSpaceApi";

export type MusicPlayRequest = {
  id: string;
  trackId: string;
};

type Language = "en" | "zh";

const labels = {
  en: {
    playlist: "Private playlist",
    noteSoundtrack: "Note soundtrack",
    play: "Play",
    pause: "Pause",
    previous: "Previous track",
    next: "Next track",
    queue: "Open playlist",
    closeQueue: "Close playlist",
    resumePlaylist: "Return to playlist",
    startMusic: "Start music",
    autoplayBlocked: "Your browser needs one tap before music can begin.",
    seek: "Track progress",
    volume: "Volume",
    nowPlaying: "Now playing",
    openService: "Open in music service",
    playbackFailed: "This audio source could not be played.",
  },
  zh: {
    playlist: "私人歌单",
    noteSoundtrack: "文章配乐",
    play: "播放",
    pause: "暂停",
    previous: "上一首",
    next: "下一首",
    queue: "展开歌单",
    closeQueue: "收起歌单",
    resumePlaylist: "回到默认歌单",
    startMusic: "开启音乐",
    autoplayBlocked: "浏览器需要你点击一次，音乐才能开始。",
    seek: "播放进度",
    volume: "音量",
    nowPlaying: "正在播放",
    openService: "在音乐服务中打开",
    playbackFailed: "这个音频地址暂时无法播放。",
  },
} as const;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export function PrivateMusicPlayer({
  tracks,
  language,
  playRequest,
}: {
  tracks: PrivateMusicTrack[];
  language: Language;
  playRequest: MusicPlayRequest | null;
}) {
  const copy = labels[language];
  const activeTracks = useMemo(
    () => tracks.filter((track) => track.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [tracks],
  );
  const audioRef = useRef<HTMLAudioElement>(null);
  const shouldPlayRef = useRef(true);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [currentTrackId, setCurrentTrackId] = useState("");
  const [mode, setMode] = useState<"playlist" | "entry">("playlist");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.72);
  const [playbackError, setPlaybackError] = useState("");

  const currentTrack = tracks.find((track) => track.id === currentTrackId)
    || activeTracks[playlistIndex]
    || null;

  const attemptPlay = async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    try {
      await audio.play();
      setIsAutoplayBlocked(false);
    } catch {
      setIsPlaying(false);
      setIsAutoplayBlocked(true);
    }
  };

  const startTrack = (trackId: string, nextMode: "playlist" | "entry") => {
    shouldPlayRef.current = true;
    setMode(nextMode);
    setCurrentTrackId((current) => {
      if (current === trackId) {
        if (audioRef.current) audioRef.current.currentTime = 0;
        void attemptPlay();
      }
      return trackId;
    });
  };

  const playPlaylistIndex = (nextIndex: number) => {
    if (activeTracks.length === 0) return;
    const normalizedIndex = (nextIndex + activeTracks.length) % activeTracks.length;
    setPlaylistIndex(normalizedIndex);
    startTrack(activeTracks[normalizedIndex].id, "playlist");
  };

  useEffect(() => {
    if (activeTracks.length === 0) {
      setCurrentTrackId("");
      setIsPlaying(false);
      return;
    }

    const activeIndex = activeTracks.findIndex((track) => track.id === currentTrackId);
    if (!currentTrackId || (mode === "playlist" && activeIndex < 0)) {
      setPlaylistIndex(0);
      shouldPlayRef.current = true;
      setMode("playlist");
      setCurrentTrackId(activeTracks[0].id);
    }
  }, [activeTracks, currentTrackId, mode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    audio.load();
    setCurrentTime(0);
    setDuration(0);
    setPlaybackError("");
    if (shouldPlayRef.current) {
      shouldPlayRef.current = false;
      void attemptPlay();
    }
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!playRequest) return;
    const requestedTrack = activeTracks.find((track) => track.id === playRequest.trackId);
    if (requestedTrack) startTrack(requestedTrack.id, "entry");
  }, [playRequest?.id]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  if (!currentTrack || activeTracks.length === 0) return null;

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void attemptPlay();
    else audio.pause();
  };

  const handleEnded = () => {
    if (mode === "entry") {
      playPlaylistIndex(playlistIndex);
      return;
    }
    playPlaylistIndex(playlistIndex + 1);
  };

  return (
    <aside className="private-music-player" aria-label={copy.nowPlaying}>
      <audio
        ref={audioRef}
        src={currentTrack.audio_url}
        preload="metadata"
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onError={() => {
          setIsPlaying(false);
          setPlaybackError(copy.playbackFailed);
        }}
      />

      {isQueueOpen && (
        <div className="private-music-player__queue">
          <header>
            <span>{copy.playlist}</span>
            <button type="button" onClick={() => setIsQueueOpen(false)} aria-label={copy.closeQueue} title={copy.closeQueue}>×</button>
          </header>
          <div>
            {activeTracks.map((track, index) => (
              <button
                type="button"
                className={mode === "playlist" && currentTrack.id === track.id ? "is-current" : ""}
                key={track.id}
                onClick={() => {
                  playPlaylistIndex(index);
                  setIsQueueOpen(false);
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{track.title}</strong>
                <small>{track.artist}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="private-music-player__track">
        {currentTrack.cover_url
          ? <img src={currentTrack.cover_url} alt="" />
          : <span className="private-music-player__cover" aria-hidden="true">♪</span>}
        <div>
          <small>{mode === "entry" ? copy.noteSoundtrack : copy.playlist}</small>
          <strong>{currentTrack.title}</strong>
          <span>{currentTrack.artist}</span>
        </div>
        {currentTrack.external_url && (
          <a
            href={currentTrack.external_url}
            target="_blank"
            rel="noreferrer"
            aria-label={copy.openService}
            title={copy.openService}
          >
            ↗
          </a>
        )}
      </div>

      <div className="private-music-player__transport">
        <div className="private-music-player__buttons">
          <button type="button" onClick={() => playPlaylistIndex(playlistIndex - 1)} aria-label={copy.previous} title={copy.previous}>‹</button>
          <button className="private-music-player__play" type="button" onClick={togglePlayback} aria-label={isPlaying ? copy.pause : copy.play} title={isPlaying ? copy.pause : copy.play}>
            {isPlaying ? "Ⅱ" : "▶"}
          </button>
          <button type="button" onClick={() => playPlaylistIndex(playlistIndex + 1)} aria-label={copy.next} title={copy.next}>›</button>
        </div>
        <div className="private-music-player__timeline">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={Math.max(duration, 0)}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            aria-label={copy.seek}
            onChange={(event) => {
              const nextTime = Number(event.target.value);
              if (audioRef.current) audioRef.current.currentTime = nextTime;
              setCurrentTime(nextTime);
            }}
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="private-music-player__tools">
        {mode === "entry" && (
          <button className="private-music-player__return" type="button" onClick={() => playPlaylistIndex(playlistIndex)}>
            {copy.resumePlaylist}
          </button>
        )}
        {isAutoplayBlocked && (
          <button className="private-music-player__start" type="button" onClick={() => void attemptPlay()} title={copy.autoplayBlocked}>
            {copy.startMusic}
          </button>
        )}
        {playbackError && <span className="private-music-player__error" role="status">{playbackError}</span>}
        <label title={copy.volume}>
          <span aria-hidden="true">◖</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            aria-label={copy.volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
        </label>
        <button type="button" onClick={() => setIsQueueOpen((open) => !open)} aria-label={isQueueOpen ? copy.closeQueue : copy.queue} title={isQueueOpen ? copy.closeQueue : copy.queue}>≡</button>
      </div>
    </aside>
  );
}
