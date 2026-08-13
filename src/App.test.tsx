import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const api = vi.hoisted(() => ({
  createVisitorInvite: vi.fn(),
  deletePrivateEntry: vi.fn(),
  loadAdminDashboard: vi.fn(),
  loadPrivateSpace: vi.fn(),
  postGuestbookMessage: vi.fn(),
  savePrivateMusicTrack: vi.fn(),
  deletePrivateMusicTrack: vi.fn(),
  reorderPrivateMusicTracks: vi.fn(),
  savePrivateEntry: vi.fn(),
  setGuestbookMessageStatus: vi.fn(),
  setVisitorInviteStatus: vi.fn(),
  unlockPrivateSpace: vi.fn(),
}));

vi.mock("./privateSpaceApi", () => ({
  ...api,
  isPrivateSpaceConfigured: true,
  isTransientPrivateSpaceError: (error: unknown) => error instanceof DOMException && error.name === "AbortError",
}));

function pendingRequest<T>() {
  return new Promise<T>(() => undefined);
}

describe("owner session restoration", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.hash = "#/";
    window.scrollTo = vi.fn();
    vi.resetAllMocks();
    Object.defineProperties(window.HTMLMediaElement.prototype, {
      load: { configurable: true, value: vi.fn() },
      pause: { configurable: true, value: vi.fn() },
      play: { configurable: true, value: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("never renders the owner key form while the dashboard session is restoring", () => {
    localStorage.setItem("yuyun-owner-console-session", "owner-token");
    window.location.hash = "#/admin";
    api.loadAdminDashboard.mockReturnValue(pendingRequest());

    render(<App />);

    expect(screen.queryByPlaceholderText("Owner invitation code")).toBeNull();
    expect(screen.getByTestId("admin-session-loading")).toBeTruthy();
  });

  it("uses the saved owner session when opening the private editor", () => {
    localStorage.setItem("yuyun-owner-console-session", "owner-token");
    window.location.hash = "#/space";
    api.loadPrivateSpace.mockReturnValue(pendingRequest());

    render(<App />);

    expect(api.loadPrivateSpace).toHaveBeenCalledWith("owner-token");
    expect(screen.queryByPlaceholderText("Enter invitation code")).toBeNull();
    expect(screen.getByTestId("private-session-loading")).toBeTruthy();
  });

  it("uses the award result as the competition heading and the competition name as its result line", () => {
    window.location.hash = "#/awards";

    render(<App />);

    const heading = screen.getByRole("heading", { name: "Meritorious Winner" });
    const award = heading.closest(".award-entry");
    expect(award?.querySelector(".award-result")?.textContent).toBe("2026 MCM/ICM · Problem C");
  });

  it("turns the top navigation dark only in personal space", () => {
    window.location.hash = "#/space";
    const { unmount } = render(<App />);

    expect(document.querySelector(".site-header")?.classList.contains("site-header--dark")).toBe(true);

    unmount();
    window.location.hash = "#/awards";
    render(<App />);

    expect(document.querySelector(".site-header")?.classList.contains("site-header--dark")).toBe(false);
  });

  it("uses resume-focused home content without girl-band imagery in the minimal edition", () => {
    render(<App />);

    const actions = Array.from(document.querySelectorAll(".hero-actions a"), (link) => link.textContent);
    expect(actions).toEqual(["View projects", "View publications", "View competition results"]);
    expect(screen.getByRole("complementary", { name: "Resume profile" })).toBeTruthy();
    expect(document.querySelector('.site img[src*="band-wall"]')).toBeNull();
    expect(document.querySelector(".research-polaroid")).toBeNull();
  });

  it("keeps gallery and personal space exclusive to the girl-band edition", () => {
    render(<App />);

    const minimalNavigation = Array.from(document.querySelectorAll(".site-header .nav-links a"), (link) => link.textContent?.trim());
    expect(minimalNavigation).toEqual(["Home", "Projects", "Publications", "Awards", "Tech Notes"]);

    fireEvent.click(screen.getByRole("button", { name: "Switch to the girl-band edition" }));

    const bandNavigation = Array.from(document.querySelectorAll(".site-header .nav-links a"), (link) => link.textContent?.trim());
    expect(bandNavigation.indexOf("Tech Notes📓")).toBe(bandNavigation.indexOf("Gallery🎹") - 1);
    expect(bandNavigation.at(-1)).toBe("Personal Space🔐");
    expect(document.querySelector('.site img[src*="band-wall"]')).toBeTruthy();
  });

  it("uses compact Chinese labels in the top navigation", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Switch to Chinese" }));

    const navigation = Array.from(document.querySelectorAll(".site-header .nav-links a"), (link) => link.textContent?.trim());
    expect(navigation).toEqual(["首页", "项目", "学术", "竞赛", "笔记"]);
  });

  it("keeps page chapter numbers aligned with the top navigation order", () => {
    window.location.hash = "#/awards";
    const { unmount } = render(<App />);
    expect(document.querySelector(".chapter-no")?.textContent).toBe("03");

    unmount();
    window.location.hash = "#/notes";
    render(<App />);
    expect(document.querySelector(".chapter-no")?.textContent).toBe("04");
  });

  it("lists GSRS first and EgoSafe second without exposing the confidential GSRS PDF", () => {
    window.location.hash = "#/publications";

    render(<App />);

    const publicationHeadings = screen.getAllByRole("heading", { level: 2 });
    expect(publicationHeadings).toHaveLength(2);
    expect(publicationHeadings[0].textContent).toBe(
      "Sparse Attention for Video Generation Acceleration via Growing Sparsity and Reduced Search",
    );
    expect(publicationHeadings[1].textContent).toBe(
      "EgoSafe: A First-Person Mobile-Captured Benchmark for Visual Safety Understanding",
    );
    expect(screen.getByText("2026")).toBeTruthy();
    expect(screen.getByText("In submission")).toBeTruthy();
    expect(screen.queryByText(/NeurIPS|NIPS/i)).toBeNull();
    expect(screen.getByText("Yuyun Chen*, Tianao Li*, TianQuan Feng, Cen Chen, Huiping Zhuang, Hao Peng, and Ziqian Zeng")).toBeTruthy();
    const links = screen.getAllByRole("link", { name: "Read ↗" });
    expect(links[0].getAttribute("href")).toBe("https://arxiv.org/abs/2607.26518");
  });

  it("keeps one coming-soon placeholder on the projects and technical notes pages", () => {
    window.location.hash = "#/projects";
    const { unmount } = render(<App />);

    expect(document.querySelectorAll(".project-entry")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "Coming soon" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open note ↗" })).toBeNull();

    unmount();
    window.location.hash = "#/notes";
    render(<App />);

    expect(document.querySelectorAll(".note-sheet")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "Coming soon" })).toBeTruthy();
  });

  it("defaults to VOL. 01 minimal and uses one button to switch editions", () => {
    document.documentElement.dataset.theme = "band";
    localStorage.setItem("yuyun-site-theme", "band");
    render(<App />);

    expect(document.documentElement.dataset.theme).toBe("minimal");
    expect(document.querySelector("main.site")?.getAttribute("data-theme")).toBe("minimal");
    const switcher = screen.getByRole("button", { name: "Switch to the girl-band edition" });
    expect(switcher.textContent).toBe("VOL. 01");

    fireEvent.click(switcher);

    expect(document.documentElement.dataset.theme).toBe("band");
    expect(document.querySelector("main.site")?.getAttribute("data-theme")).toBe("band");
    const returnSwitcher = screen.getByRole("button", { name: "Switch to the minimal academic edition" });
    expect(returnSwitcher.textContent).toBe("VOL. 02");

    fireEvent.click(returnSwitcher);

    expect(document.documentElement.dataset.theme).toBe("minimal");
  });

  it("opens legacy gallery and personal-space links in the girl-band edition", () => {
    window.location.hash = "#/gallery";
    const { unmount } = render(<App />);

    expect(document.documentElement.dataset.theme).toBe("band");
    expect(screen.getByRole("heading", { name: "Visual record" })).toBeTruthy();

    unmount();
    localStorage.clear();
    window.location.hash = "#/space";
    render(<App />);

    expect(document.documentElement.dataset.theme).toBe("band");
    expect(screen.getByPlaceholderText("Enter invitation code")).toBeTruthy();
  });

  it("adds a linked contents rail to editorial list pages", () => {
    window.location.hash = "#/publications";

    render(<App />);

    const contents = screen.getAllByRole("navigation", { name: "Contents" });
    expect(contents).toHaveLength(2);
    expect(contents[0].querySelector('a[href="#publication-1"]')?.textContent).toContain("Sparse Attention");
    expect(contents[0].querySelector('a[href="#publication-2"]')?.textContent).toContain("EgoSafe");
  });

  it("copies the Outlook address and shows a confirmation", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Copy Outlook email" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("chensilu_0717@outlook.com"));
    expect(screen.getByRole("status").textContent).toContain("Email address copied to clipboard");
  });

  it("automatically retries the first transient entry save with one stable entry id", async () => {
    localStorage.setItem("yuyun-owner-console-session", "owner-token");
    window.location.hash = "#/space";
    api.loadPrivateSpace.mockResolvedValue({
      visitor: {
        name: "Yuyun",
        visitor_number: 1,
        visit_count: 1,
        is_owner: true,
      },
      entries: [],
      messages: [],
    });
    api.savePrivateEntry
      .mockRejectedValueOnce(new DOMException("Timed out", "AbortError"))
      .mockImplementation((_token, entry) => Promise.resolve({
        ...entry,
        id: "saved-entry",
      }));

    render(<App />);
    fireEvent.change(await screen.findByPlaceholderText("A title for this fragment"), {
      target: { value: "First-save recovery" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    await waitFor(() => expect(api.savePrivateEntry).toHaveBeenCalledTimes(2));
    const firstId = api.savePrivateEntry.mock.calls[0][1].id;
    const secondId = api.savePrivateEntry.mock.calls[1][1].id;
    expect(firstId).toBeTruthy();
    expect(secondId).toBe(firstId);
    expect(await screen.findByText("Saved as a private draft.")).toBeTruthy();
  });

  it("retries a guestbook post once and immediately renders the saved read-only card", async () => {
    sessionStorage.setItem("yuyun-private-space-session", "visitor-token");
    window.location.hash = "#/space";
    api.loadPrivateSpace.mockResolvedValue({
      visitor: {
        name: "Visitor",
        visitor_number: 2,
        visit_count: 1,
        is_owner: false,
      },
      entries: [],
      messages: [],
    });
    api.postGuestbookMessage
      .mockRejectedValueOnce(new DOMException("Timed out", "AbortError"))
      .mockResolvedValue({
        id: "message-one",
        visitor_name: "Visitor",
        body: "I was here.",
        created_at: "2026-07-23T05:00:00.000Z",
      });

    render(<App />);
    fireEvent.change(await screen.findByPlaceholderText("Write something here..."), {
      target: { value: "I was here." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Pin this note" }));

    await waitFor(() => expect(api.postGuestbookMessage).toHaveBeenCalledTimes(2));
    expect(api.postGuestbookMessage.mock.calls[0][2]).toBeTruthy();
    expect(api.postGuestbookMessage.mock.calls[1][2]).toBe(api.postGuestbookMessage.mock.calls[0][2]);
    expect(await screen.findByText("I was here.")).toBeTruthy();
    expect(screen.queryByText("Your note has been delivered to Yuyun.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete message" })).toBeNull();
  });

  it("keeps visit counts out of the visitor pass", async () => {
    sessionStorage.setItem("yuyun-private-space-session", "visitor-token");
    window.location.hash = "#/space";
    api.loadPrivateSpace.mockResolvedValue({
      visitor: {
        name: "Visitor",
        visitor_number: 2,
        visit_count: 7,
        is_owner: false,
      },
      entries: [],
      messages: [],
    });

    render(<App />);

    expect(await screen.findByText("VISITOR PASS")).toBeTruthy();
    expect(screen.getByText("#002")).toBeTruthy();
    expect(screen.queryByText("7 recorded visits")).toBeNull();
  });

  it("keeps article cards collapsed until the visitor expands one", async () => {
    sessionStorage.setItem("yuyun-private-space-session", "visitor-token");
    window.location.hash = "#/space";
    api.loadPrivateSpace.mockResolvedValue({
      visitor: {
        name: "Visitor",
        visitor_number: 2,
        visit_count: 1,
        is_owner: false,
      },
      entries: [{
        id: "entry-one",
        kind: "writing",
        title: "A private note",
        excerpt: "A short excerpt",
        body: "Intro paragraph.\n\n{{media:inline}}\n\n| Model | Score |\n| --- | ---: |\n| Baseline | 0.91 |",
        image_url: `yuyun-media-v1:${JSON.stringify([
          {
            id: "cover",
            src: "data:image/webp;base64,cover",
            size: "full",
            align: "center",
            caption: "",
            focusX: 24,
            focusY: 72,
            isCover: true,
          },
          {
            id: "inline",
            src: "data:image/webp;base64,inline",
            size: "small",
            align: "right",
            caption: "Inline result",
            focusX: 50,
            focusY: 50,
            isCover: false,
          },
        ])}`,
        external_url: null,
        event_date: "2026-07-23",
        is_published: true,
      }],
      messages: [],
    });

    const { container } = render(<App />);
    expect(await screen.findByRole("heading", { name: "A private note" })).toBeTruthy();
    expect(container.querySelector(".archive-entry")?.classList.contains("is-expanded")).toBe(false);
    expect(container.querySelector("table")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));

    const expandedEntry = container.querySelector(".archive-entry");
    const body = container.querySelector(".archive-entry__body");
    const inlineMedia = container.querySelector(".archive-entry__inline-media");
    expect(expandedEntry?.classList.contains("is-expanded")).toBe(true);
    expect(body).toBeTruthy();
    expect(container.querySelector("table")).toBeTruthy();
    expect(container.querySelector(".archive-entry__gallery")).toBeNull();
    expect(inlineMedia?.querySelector("img")?.getAttribute("src")).toContain("inline");
    const table = container.querySelector("table");
    expect(inlineMedia && table
      ? Boolean(inlineMedia.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING)
      : false).toBe(true);

    const closeButtons = screen.getAllByRole("button", { name: "Close article" });
    expect(closeButtons).toHaveLength(2);
    fireEvent.click(closeButtons[0]);
    expect(expandedEntry?.classList.contains("is-expanded")).toBe(false);
    expect(container.querySelector("table")).toBeNull();
  });

  it("renders film notes with a Douban link and filters entries by type and date range", async () => {
    sessionStorage.setItem("yuyun-private-space-session", "visitor-token");
    window.location.hash = "#/space";
    api.loadPrivateSpace.mockResolvedValue({
      visitor: {
        name: "Visitor",
        visitor_number: 2,
        visit_count: 1,
        is_owner: false,
      },
      entries: [
        {
          id: "film-one",
          kind: "film",
          title: "A film note",
          excerpt: "After the screening",
          body: "A review.",
          image_url: null,
          external_url: "https://movie.douban.com/subject/1295644/",
          event_date: "2026-07-20",
          is_published: true,
        },
        {
          id: "writing-one",
          kind: "writing",
          title: "A notebook page",
          excerpt: "An essay",
          body: "A draft.",
          image_url: null,
          external_url: null,
          event_date: "2025-05-10",
          is_published: true,
        },
      ],
      messages: [],
    });

    render(<App />);
    const doubanLink = await screen.findByRole("link", { name: "View on Douban" });
    expect(doubanLink.getAttribute("href"))
      .toBe("https://movie.douban.com/subject/1295644/");
    expect(doubanLink.classList.contains("archive-entry__external")).toBe(true);

    const startDateInput = screen.getByLabelText("Start date");
    const endDateInput = screen.getByLabelText("End date");
    expect(startDateInput.getAttribute("type")).toBe("text");
    expect(startDateInput.getAttribute("placeholder")).toBe("yyyymmdd");
    expect(endDateInput.getAttribute("placeholder")).toBe("yyyymmdd");

    fireEvent.change(screen.getByLabelText("Filter by type"), { target: { value: "writing" } });
    expect(screen.queryByRole("heading", { name: "A film note" })).toBeNull();
    expect(screen.getByRole("heading", { name: "A notebook page" })).toBeTruthy();

    fireEvent.change(startDateInput, { target: { value: "20260101" } });
    expect(screen.queryByRole("heading", { name: "A notebook page" })).toBeNull();

    fireEvent.change(screen.getByLabelText("Filter by type"), { target: { value: "all" } });
    expect(screen.getByRole("heading", { name: "A film note" })).toBeTruthy();

    fireEvent.change(startDateInput, { target: { value: "" } });
    fireEvent.change(endDateInput, { target: { value: "2025-12-31" } });
    expect(screen.queryByRole("heading", { name: "A film note" })).toBeNull();
    expect(screen.getByRole("heading", { name: "A notebook page" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Switch to Chinese" }));
    expect(screen.getByLabelText("起始日期").getAttribute("placeholder")).toBe("年月日");
    expect(screen.getByLabelText("终止日期").getAttribute("placeholder")).toBe("年月日");
    expect((screen.getByLabelText("终止日期") as HTMLInputElement).value).toBe("2025年12月31日");
  });

  it("uses the creation date for undated visitor entries and keeps them filterable", async () => {
    sessionStorage.setItem("yuyun-private-space-session", "visitor-token");
    window.location.hash = "#/space";
    api.loadPrivateSpace.mockResolvedValue({
      visitor: {
        name: "Visitor",
        visitor_number: 2,
        visit_count: 1,
        is_owner: false,
      },
      entries: [{
        id: "undated-writing",
        kind: "writing",
        title: "A saved fragment",
        excerpt: "No event date was selected",
        body: "A draft.",
        image_url: null,
        external_url: null,
        event_date: null,
        display_date: "2025-04-06",
        is_published: true,
      }],
      messages: [],
    });

    render(<App />);

    expect(await screen.findByText("Writing · 2025-04-06")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2025-01-01" } });
    expect(screen.getByRole("heading", { name: "A saved fragment" })).toBeTruthy();
  });

  it("keeps the default playlist until a visitor explicitly starts an article soundtrack", async () => {
    sessionStorage.setItem("yuyun-private-space-session", "visitor-token");
    window.location.hash = "#/space";
    api.loadPrivateSpace.mockResolvedValue({
      visitor: {
        name: "Visitor",
        visitor_number: 2,
        visit_count: 1,
        is_owner: false,
      },
      playlist: [
        {
          id: "default-track",
          title: "Default song",
          artist: "Yuyun",
          audio_url: "/audio/default.mp3",
          cover_url: null,
          external_url: null,
          is_active: true,
          sort_order: 0,
        },
        {
          id: "entry-track",
          title: "Entry song",
          artist: "Yuyun",
          audio_url: "/audio/entry.mp3",
          cover_url: null,
          external_url: null,
          is_active: true,
          sort_order: 1,
        },
      ],
      entries: [{
        id: "soundtracked-entry",
        kind: "writing",
        title: "A soundtracked note",
        excerpt: "Listen while reading",
        body: "A note.",
        image_url: null,
        external_url: null,
        event_date: "2026-08-04",
        display_date: "2026-08-04",
        music_track_id: "entry-track",
        is_published: true,
      }],
      messages: [],
    });

    const { container } = render(<App />);

    await screen.findByRole("heading", { name: "A soundtracked note" });
    const audio = container.querySelector("audio");
    expect(audio?.getAttribute("src")).toBe("/audio/default.mp3");

    fireEvent.click(screen.getByRole("button", { name: "Play this note's soundtrack: Entry song" }));
    await waitFor(() => expect(audio?.getAttribute("src")).toBe("/audio/entry.mp3"));
    expect(screen.getByRole("button", { name: "Return to playlist" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Return to playlist" }));
    await waitFor(() => expect(audio?.getAttribute("src")).toBe("/audio/default.mp3"));
  });
});
