import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { PrivateMusicTrack } from "./privateSpaceApi";

export type MusicPlayRequest = {
  id: string;
  trackId: string;
  mode?: "playlist" | "entry";
};

type PlaybackMode = "shuffle" | "sequence" | "repeat";

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
    shuffle: "Shuffle",
    sequence: "Play in order",
    repeat: "Repeat one",
    minimize: "Minimize player",
    restore: "Restore player",
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
    shuffle: "随机播放",
    sequence: "顺序播放",
    repeat: "单曲循环",
    minimize: "最小化播放器",
    restore: "展开播放器",
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
  const shouldPlayRef = useRef(false);
  const shuffleQueueRef = useRef<string[]>([]);
  const shufflePositionRef = useRef(0);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [currentTrackId, setCurrentTrackId] = useState("");
  const [mode, setMode] = useState<"playlist" | "entry">("playlist");
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("shuffle");
  const [hasStarted, setHasStarted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.72);
  const [playbackError, setPlaybackError] = useState("");
  const [miniPosition, setMiniPosition] = useState<{ left: number; top: number } | null>(null);
  const miniDragRef = useRef<{ startX: number; startY: number; left: number; top: number; dragged: boolean } | null>(null);

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
        if (audioRef.current) {
          shouldPlayRef.current = false;
          audioRef.current.currentTime = 0;
          void attemptPlay();
        }
      }
      return trackId;
    });
  };

  const buildShuffleQueue = (startTrackId: string) => {
    const remainingTrackIds = activeTracks
      .map((track) => track.id)
      .filter((trackId) => trackId !== startTrackId);
    for (let index = remainingTrackIds.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [remainingTrackIds[index], remainingTrackIds[randomIndex]] = [remainingTrackIds[randomIndex], remainingTrackIds[index]];
    }
    const queue = [startTrackId, ...remainingTrackIds];
    shuffleQueueRef.current = queue;
    shufflePositionRef.current = 0;
    return queue;
  };

  const playPlaylistIndex = (nextIndex: number) => {
    if (activeTracks.length === 0) return;
    const normalizedIndex = (nextIndex + activeTracks.length) % activeTracks.length;
    setPlaylistIndex(normalizedIndex);
    startTrack(activeTracks[normalizedIndex].id, "playlist");
  };

  const startPlaylistAt = (nextIndex: number) => {
    if (activeTracks.length === 0) return;
    const normalizedIndex = (nextIndex + activeTracks.length) % activeTracks.length;
    buildShuffleQueue(activeTracks[normalizedIndex].id);
    playPlaylistIndex(normalizedIndex);
  };

  const playShuffleStep = (offset: -1 | 1) => {
    if (activeTracks.length === 0) return;
    const currentPlaylistTrack = activeTracks[playlistIndex] || activeTracks[0];
    const activeIds = new Set(activeTracks.map((track) => track.id));
    let queue = shuffleQueueRef.current;
    let position = shufflePositionRef.current;
    const queueIsCurrent = queue.length === activeTracks.length
      && queue.every((trackId) => activeIds.has(trackId))
      && queue[position] === currentPlaylistTrack.id;

    if (!queueIsCurrent) {
      queue = buildShuffleQueue(currentPlaylistTrack.id);
      position = 0;
    }

    let nextPosition = position + offset;
    if (nextPosition < 0) return;
    if (nextPosition >= queue.length) {
      queue = buildShuffleQueue(currentPlaylistTrack.id);
      nextPosition = Math.min(1, queue.length - 1);
    }

    shufflePositionRef.current = nextPosition;
    const nextTrackIndex = activeTracks.findIndex((track) => track.id === queue[nextPosition]);
    if (nextTrackIndex >= 0) playPlaylistIndex(nextTrackIndex);
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
  }, [currentTrack?.id, hasStarted]);

  useEffect(() => {
    if (!playRequest) return;
    const requestedTrack = activeTracks.find((track) => track.id === playRequest.trackId);
    if (requestedTrack) {
      setHasStarted(true);
      setIsMinimized(false);
      const requestedMode = playRequest.mode || "entry";
      if (requestedMode === "playlist") {
        const requestedIndex = activeTracks.findIndex((track) => track.id === requestedTrack.id);
        buildShuffleQueue(requestedTrack.id);
        setPlaylistIndex(requestedIndex);
      }
      startTrack(requestedTrack.id, requestedMode);
    }
  }, [playRequest?.id]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  if (!hasStarted || !currentTrack || activeTracks.length === 0) return null;

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
    if (playbackMode === "repeat") {
      if (audioRef.current) audioRef.current.currentTime = 0;
      void attemptPlay();
      return;
    }
    if (playbackMode === "shuffle") {
      playShuffleStep(1);
      return;
    }
    playPlaylistIndex(playlistIndex + 1);
  };

  const playbackModes: PlaybackMode[] = ["shuffle", "sequence", "repeat"];
  const nextPlaybackMode = () => {
    const currentIndex = playbackModes.indexOf(playbackMode);
    const nextMode = playbackModes[(currentIndex + 1) % playbackModes.length];
    if (nextMode === "shuffle" && currentTrack) buildShuffleQueue(currentTrack.id);
    setPlaybackMode(nextMode);
  };
  const playbackModeLabel = copy[playbackMode];

  const handleMiniPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    miniDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      dragged: false,
    };
  };

  const handleMiniPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = miniDragRef.current;
    if (!drag) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) drag.dragged = true;
    if (!drag.dragged) return;
    const size = event.currentTarget.getBoundingClientRect().width;
    setMiniPosition({
      left: Math.max(8, Math.min(window.innerWidth - size - 8, drag.left + deltaX)),
      top: Math.max(76, Math.min(window.innerHeight - size - 8, drag.top + deltaY)),
    });
  };

  const handleMiniClick = () => {
    const wasDragged = miniDragRef.current?.dragged;
    miniDragRef.current = null;
    if (!wasDragged) setIsMinimized(false);
  };

  const audioElement = (
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
  );

  if (isMinimized) {
    return <>
      {audioElement}
      <button
        className={`private-music-player__mini${isPlaying ? " is-playing" : ""}`}
        type="button"
        style={miniPosition ? { left: miniPosition.left, top: miniPosition.top, right: "auto", bottom: "auto" } : undefined}
        onPointerDown={handleMiniPointerDown}
        onPointerMove={handleMiniPointerMove}
        onPointerCancel={() => { miniDragRef.current = null; }}
        onClick={handleMiniClick}
        aria-label={copy.restore}
        title={copy.restore}
      >
        {currentTrack.cover_url ? <img src={currentTrack.cover_url} alt="" /> : <span aria-hidden="true">♪</span>}
        <i aria-hidden="true" />
      </button>
    </>;
  }

  return <>
    {audioElement}
    <aside className="private-music-player" aria-label={copy.nowPlaying}>
      <button
        className="private-music-player__minimize"
        type="button"
        onClick={() => setIsMinimized(true)}
        aria-label={copy.minimize}
        title={copy.minimize}
      >
        <span aria-hidden="true">—</span>
      </button>

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
                  startPlaylistAt(index);
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
          <button type="button" onClick={() => playbackMode === "shuffle" && mode === "playlist" ? playShuffleStep(-1) : playPlaylistIndex(playlistIndex - 1)} aria-label={copy.previous} title={copy.previous}>‹</button>
          <button className="private-music-player__play" type="button" onClick={togglePlayback} aria-label={isPlaying ? copy.pause : copy.play} title={isPlaying ? copy.pause : copy.play}>
            <span className={`private-music-player__play-icon${isPlaying ? " is-paused" : ""}`} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => playbackMode === "shuffle" && mode === "playlist" ? playShuffleStep(1) : playPlaylistIndex(playlistIndex + 1)} aria-label={copy.next} title={copy.next}>›</button>
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
        <button
          className="private-music-player__mode"
          type="button"
          onClick={nextPlaybackMode}
          aria-label={playbackModeLabel}
          title={playbackModeLabel}
        >
          <span aria-hidden="true">{playbackMode === "shuffle" ? "⇄" : playbackMode === "sequence" ? "→" : "↻¹"}</span>
        </button>
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
  </>;
}
