import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrivateMusicLibraryEditor } from "./PrivateMusicLibraryEditor";

const api = vi.hoisted(() => ({
  deletePrivateMusicTrack: vi.fn(),
  reorderPrivateMusicTracks: vi.fn(),
  savePrivateMusicTrack: vi.fn(),
}));

vi.mock("./privateSpaceApi", () => ({
  ...api,
  isTransientPrivateSpaceError: () => false,
}));

describe("PrivateMusicLibraryEditor", () => {
  it("saves direct audio separately from an optional music-service link", async () => {
    api.savePrivateMusicTrack.mockResolvedValue({
      id: "track-one",
      title: "Spring",
      artist: "MyGO!!!!!",
      audio_url: "https://cdn.example.com/spring.mp3",
      cover_url: null,
      external_url: "https://music.163.com/#/song?id=1",
      is_active: true,
      sort_order: 0,
    });
    const onTracksChange = vi.fn();

    render(
      <PrivateMusicLibraryEditor
        sessionToken="owner-token"
        tracks={[]}
        language="en"
        onTracksChange={onTracksChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "New track +" }));
    fireEvent.change(screen.getByLabelText("Track title"), { target: { value: "Spring" } });
    fireEvent.change(screen.getByLabelText("Artist"), { target: { value: "MyGO!!!!!" } });
    fireEvent.change(screen.getByLabelText("Audio file address"), { target: { value: "https://cdn.example.com/spring.mp3" } });
    fireEvent.change(screen.getByLabelText("NetEase / music-service link (optional)"), { target: { value: "https://music.163.com/#/song?id=1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save track" }));

    await waitFor(() => expect(api.savePrivateMusicTrack).toHaveBeenCalledTimes(1));
    expect(api.savePrivateMusicTrack).toHaveBeenCalledWith("owner-token", expect.objectContaining({
      title: "Spring",
      artist: "MyGO!!!!!",
      audio_url: "https://cdn.example.com/spring.mp3",
      external_url: "https://music.163.com/#/song?id=1",
    }));
    expect(onTracksChange).toHaveBeenCalledWith([expect.objectContaining({ id: "track-one" })]);
  });
});
