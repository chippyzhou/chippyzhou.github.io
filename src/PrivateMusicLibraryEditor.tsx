import { useMemo, useState } from "react";
import {
  deletePrivateMusicTrack,
  isTransientPrivateSpaceError,
  reorderPrivateMusicTracks,
  savePrivateMusicTrack,
  uploadPrivateMedia,
  type PrivateMusicTrack,
} from "./privateSpaceApi";

type Language = "en" | "zh";

type TrackDraft = {
  id: string | null;
  title: string;
  artist: string;
  album: string;
  description: string;
  audio_url: string;
  audio_storage_url: string;
  cover_url: string;
  cover_storage_url: string;
  external_url: string;
  is_active: boolean;
};

const labels = {
  en: {
    kicker: "Owner studio / soundtrack desk",
    title: "Curate the private playlist.",
    newTrack: "New track +",
    playlist: "Playlist order",
    empty: "No tracks yet.",
    trackTitle: "Track title",
    artist: "Artist",
    album: "Album",
    description: "One-line note",
    audioSource: "Audio file address",
    coverSource: "Cover image address",
    uploadAudio: "Upload audio file",
    uploadCover: "Upload cover image",
    uploading: "Uploading...",
    uploaded: "File uploaded.",
    externalSource: "NetEase / music-service link (optional)",
    active: "Include in the visitor playlist",
    save: "Save track",
    saving: "Saving...",
    delete: "Delete",
    saved: "Playlist updated.",
    required: "A title and audio file address are required.",
    deleteConfirm: "Delete this track from the private playlist?",
    moveEarlier: "Move track earlier",
    moveLater: "Move track later",
    activeStatus: "Active",
    pausedStatus: "Hidden",
    artwork: "Track artwork",
    trackTitlePlaceholder: "Song title",
    artistPlaceholder: "Artist or band",
    albumPlaceholder: "Album or single",
    descriptionPlaceholder: "Optional note shown on the record wall",
    audioPlaceholder: "https://.../song.mp3",
    coverPlaceholder: "https://.../cover.jpg",
    externalPlaceholder: "https://music.163.com/#/song?id=...",
  },
  zh: {
    kicker: "管理员工作室 / 配乐台",
    title: "编排私人歌单。",
    newTrack: "新增歌曲 +",
    playlist: "歌单顺序",
    empty: "歌单里还没有歌曲。",
    trackTitle: "歌曲名",
    artist: "歌手 / 乐队",
    album: "所属专辑",
    description: "一句话介绍",
    audioSource: "音频文件地址",
    coverSource: "封面图片地址",
    uploadAudio: "上传音频文件",
    uploadCover: "上传封面图片",
    uploading: "上传中...",
    uploaded: "文件已上传。",
    externalSource: "网易云 / 音乐服务链接（可选）",
    active: "加入访客默认歌单",
    save: "保存歌曲",
    saving: "保存中...",
    delete: "删除",
    saved: "歌单已更新。",
    required: "请输入歌曲名和音频文件地址。",
    deleteConfirm: "从私人歌单中删除这首歌？",
    moveEarlier: "向前移动歌曲",
    moveLater: "向后移动歌曲",
    activeStatus: "播放中",
    pausedStatus: "已隐藏",
    artwork: "歌曲封面",
    trackTitlePlaceholder: "歌曲标题",
    artistPlaceholder: "歌手或乐队",
    albumPlaceholder: "专辑或单曲名称",
    descriptionPlaceholder: "可选，展示在唱片墙上",
    audioPlaceholder: "https://.../song.mp3",
    coverPlaceholder: "https://.../cover.jpg",
    externalPlaceholder: "https://music.163.com/#/song?id=...",
  },
} as const;

function blankTrack(): TrackDraft {
  return {
    id: null,
    title: "",
    artist: "",
    album: "",
    description: "",
    audio_url: "",
    audio_storage_url: "",
    cover_url: "",
    cover_storage_url: "",
    external_url: "",
    is_active: true,
  };
}

function trackToDraft(track: PrivateMusicTrack): TrackDraft {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album || "",
    description: track.description || "",
    audio_url: track.audio_url,
    audio_storage_url: track.audio_storage_url || "",
    cover_url: track.cover_url || "",
    cover_storage_url: track.cover_storage_url || "",
    external_url: track.external_url || "",
    is_active: track.is_active,
  };
}

export function PrivateMusicLibraryEditor({
  sessionToken,
  tracks,
  language,
  onTracksChange,
}: {
  sessionToken: string;
  tracks: PrivateMusicTrack[];
  language: Language;
  onTracksChange: (tracks: PrivateMusicTrack[]) => void;
}) {
  const copy = labels[language];
  const orderedTracks = useMemo(
    () => [...tracks].sort((a, b) => a.sort_order - b.sort_order),
    [tracks],
  );
  const [draft, setDraft] = useState<TrackDraft>(blankTrack);
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const updateDraft = <Key extends keyof TrackDraft>(key: Key, value: TrackDraft[Key]) => {
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === "audio_url" ? { audio_storage_url: "" } : {}),
      ...(key === "cover_url" ? { cover_storage_url: "" } : {}),
    }));
    setError("");
    setNotice("");
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.audio_url.trim()) {
      setError(copy.required);
      return;
    }
    setIsBusy(true);
    setError("");
    setNotice("");
    const payload = {
      id: draft.id || crypto.randomUUID(),
      title: draft.title.trim(),
      artist: draft.artist.trim(),
      album: draft.album.trim(),
      description: draft.description.trim(),
      audio_url: draft.audio_storage_url || draft.audio_url.trim(),
      cover_url: draft.cover_storage_url || draft.cover_url.trim() || null,
      external_url: draft.external_url.trim() || null,
      is_active: draft.is_active,
    };
    try {
      let savedTrack: PrivateMusicTrack;
      try {
        savedTrack = await savePrivateMusicTrack(sessionToken, payload);
      } catch (requestError) {
        if (!isTransientPrivateSpaceError(requestError)) throw requestError;
        savedTrack = await savePrivateMusicTrack(sessionToken, payload);
      }
      const nextTracks = tracks.some((track) => track.id === savedTrack.id)
        ? tracks.map((track) => track.id === savedTrack.id ? savedTrack : track)
        : [...tracks, savedTrack];
      onTracksChange(nextTracks);
      setDraft(trackToDraft(savedTrack));
      setNotice(copy.saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.required);
    } finally {
      setIsBusy(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    kind: "audio" | "image",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError("");
    setNotice(copy.uploading);
    try {
      const uploaded = await uploadPrivateMedia(sessionToken, file, kind);
      setDraft((current) => kind === "audio"
        ? { ...current, audio_url: uploaded.url, audio_storage_url: uploaded.storage_url }
        : { ...current, cover_url: uploaded.url, cover_storage_url: uploaded.storage_url });
      setError("");
      setNotice(copy.uploaded);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : copy.required);
      setNotice("");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleDelete = async (trackId = draft.id) => {
    if (!trackId || !window.confirm(copy.deleteConfirm)) return;
    setIsBusy(true);
    setError("");
    try {
      await deletePrivateMusicTrack(sessionToken, trackId);
      onTracksChange(tracks.filter((track) => track.id !== trackId));
      if (draft.id === trackId) setDraft(blankTrack());
      setNotice(copy.saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.required);
    } finally {
      setIsBusy(false);
    }
  };

  const moveTrack = async (trackId: string, offset: number) => {
    const sourceIndex = orderedTracks.findIndex((track) => track.id === trackId);
    const targetIndex = sourceIndex + offset;
    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= orderedTracks.length) return;
    const nextTracks = [...orderedTracks];
    const [movedTrack] = nextTracks.splice(sourceIndex, 1);
    nextTracks.splice(targetIndex, 0, movedTrack);
    const optimisticTracks = nextTracks.map((track, index) => ({ ...track, sort_order: index }));
    onTracksChange(optimisticTracks);
    setError("");
    try {
      const savedTracks = await reorderPrivateMusicTracks(sessionToken, nextTracks.map((track) => track.id));
      onTracksChange(savedTracks);
    } catch (requestError) {
      onTracksChange(tracks);
      setError(requestError instanceof Error ? requestError.message : copy.required);
    }
  };

  return (
    <section className="music-library-editor">
      <header className="music-library-editor__header">
        <div>
          <p className="space-eyebrow">{copy.kicker}</p>
          <h2>{copy.title}</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsOpen((open) => !open);
            if (isOpen) setDraft(blankTrack());
            setError("");
            setNotice("");
          }}
        >
          {copy.newTrack}
        </button>
      </header>

      <div className="music-library-editor__grid">
        <div className="music-library-editor__tracks">
          <p className="space-editor__label">{copy.playlist}</p>
          {orderedTracks.length === 0 && <p className="music-library-editor__empty">{copy.empty}</p>}
          {orderedTracks.map((track, index) => (
            <article className={draft.id === track.id ? "is-selected" : ""} key={track.id}>
              <button
                className="music-library-editor__select"
                type="button"
                onClick={() => {
                  setDraft(trackToDraft(track));
                  setIsOpen(true);
                  setError("");
                  setNotice("");
                }}
              >
                {track.cover_url
                  ? <img src={track.cover_url} alt="" />
                  : <span aria-hidden="true">♪</span>}
                <div>
                  <strong>{track.title}</strong>
                  <small>{track.artist || "—"} · {track.is_active ? copy.activeStatus : copy.pausedStatus}</small>
                </div>
              </button>
              <div>
                <button type="button" disabled={index === 0 || isBusy} aria-label={copy.moveEarlier} title={copy.moveEarlier} onClick={() => void moveTrack(track.id, -1)}>↑</button>
                <button type="button" disabled={index === orderedTracks.length - 1 || isBusy} aria-label={copy.moveLater} title={copy.moveLater} onClick={() => void moveTrack(track.id, 1)}>↓</button>
                <button className="music-library-editor__delete-track" type="button" disabled={isBusy} aria-label={`${copy.delete}: ${track.title}`} title={`${copy.delete}: ${track.title}`} onClick={() => void handleDelete(track.id)}>×</button>
              </div>
            </article>
          ))}
        </div>

        {isOpen && (
          <form className="music-library-editor__form" onSubmit={handleSave}>
            {draft.cover_url
              ? <img className="music-library-editor__artwork" src={draft.cover_url} alt={copy.artwork} />
              : <div className="music-library-editor__artwork music-library-editor__artwork--empty" aria-hidden="true">♪</div>}
            <label>
              {copy.trackTitle}
              <input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} placeholder={copy.trackTitlePlaceholder} />
            </label>
            <label>
              {copy.artist}
              <input value={draft.artist} onChange={(event) => updateDraft("artist", event.target.value)} placeholder={copy.artistPlaceholder} />
            </label>
            <label>
              {copy.album}
              <input value={draft.album} onChange={(event) => updateDraft("album", event.target.value)} placeholder={copy.albumPlaceholder} />
            </label>
            <label>
              {copy.description}
              <input value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} placeholder={copy.descriptionPlaceholder} maxLength={240} />
            </label>
            <label>
              {copy.audioSource}
              <input inputMode="url" value={draft.audio_url} onChange={(event) => updateDraft("audio_url", event.target.value)} placeholder={copy.audioPlaceholder} />
            </label>
            <label className="music-library-editor__upload">
              {copy.uploadAudio}
              <input type="file" accept="audio/*" disabled={isUploading} onChange={(event) => void handleFileUpload(event, "audio")} />
            </label>
            <label>
              {copy.coverSource}
              <input inputMode="url" value={draft.cover_url} onChange={(event) => updateDraft("cover_url", event.target.value)} placeholder={copy.coverPlaceholder} />
            </label>
            <label className="music-library-editor__upload">
              {copy.uploadCover}
              <input type="file" accept="image/*" disabled={isUploading} onChange={(event) => void handleFileUpload(event, "image")} />
            </label>
            <label>
              {copy.externalSource}
              <input inputMode="url" value={draft.external_url} onChange={(event) => updateDraft("external_url", event.target.value)} placeholder={copy.externalPlaceholder} />
            </label>
            <label className="music-library-editor__active">
              <input type="checkbox" checked={draft.is_active} onChange={(event) => updateDraft("is_active", event.target.checked)} />
              {copy.active}
            </label>
            {error && <p className="space-editor__error" role="alert">{error}</p>}
            {notice && <p className="space-editor__notice" role="status">{notice}</p>}
            <div className="music-library-editor__actions">
              <button type="submit" disabled={isBusy || isUploading}>{isBusy ? copy.saving : copy.save}</button>
              {draft.id && <button type="button" className="is-delete" disabled={isBusy} onClick={() => void handleDelete()}>{copy.delete}</button>}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
