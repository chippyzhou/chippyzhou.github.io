import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const api = vi.hoisted(() => ({
  createVisitorInvite: vi.fn(),
  deleteVisitorInvite: vi.fn(),
  deletePrivateEntry: vi.fn(),
  deletePrivateMusicTrack: vi.fn(),
  loadAdminDashboard: vi.fn(),
  loadPrivateSpace: vi.fn(),
  loadPublicTechnicalNotes: vi.fn(),
  postPrivateEntryComment: vi.fn(),
  postGuestbookMessage: vi.fn(),
  reorderPrivateMusicTracks: vi.fn(),
  resetVisitorInviteCode: vi.fn(),
  savePrivateMusicTrack: vi.fn(),
  savePrivateEntry: vi.fn(),
  setGuestbookMessageStatus: vi.fn(),
  setGuestbookMessageReply: vi.fn(),
  setVisitorInviteStatus: vi.fn(),
  togglePrivateEntryLike: vi.fn(),
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
    api.loadPublicTechnicalNotes.mockResolvedValue([]);
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

  it("keeps the Android private-space key field editable and keyboard-friendly", () => {
    window.location.hash = "#/space";

    render(<App />);

    const invitation = screen.getByLabelText("Your personal invitation") as HTMLInputElement;
    expect(invitation.type).toBe("password");
    expect(invitation.readOnly).toBe(false);
    expect(invitation.getAttribute("autocapitalize")).toBe("none");
    expect(invitation.getAttribute("autocorrect")).toBe("off");
    expect(invitation.getAttribute("spellcheck")).toBe("false");
    fireEvent.change(invitation, { target: { value: "Android-check" } });
    expect(invitation.value).toBe("Android-check");
  });

  it("uses the award result as the competition heading and the competition name as its result line", () => {
    window.location.hash = "#/awards";

    render(<App />);

    const heading = screen.getByRole("heading", { name: "Meritorious Winner" });
    const award = heading.closest(".award-entry");
    expect(award?.querySelector(".award-result")?.textContent).toBe("2026 MCM/ICM · Problem C");
  });

  it("uses the private header treatment throughout the girl-band edition", async () => {
    window.location.hash = "#/space";
    const { unmount } = render(<App />);

    expect(document.querySelector(".site-header")?.classList.contains("site-header--dark")).toBe(true);

    unmount();
    window.location.hash = "#/writing";
    api.unlockPrivateSpace.mockResolvedValue({ name: "Visitor", visitor_number: 1, is_owner: false, session_token: "visitor-token" });
    api.loadPrivateSpace.mockResolvedValue({ visitor: { name: "Visitor", visitor_number: 1, visit_count: 1, is_owner: false }, entries: [], messages: [], playlist: [] });
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText("Enter invitation code"), { target: { value: "visitor-code" } });
    fireEvent.click(screen.getByRole("button", { name: "Enter ↗" }));

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("band"));
    expect(document.querySelector(".site-header")?.classList.contains("site-header--dark")).toBe(true);
  });

  it("uses resume-focused home content without girl-band imagery in the minimal edition", () => {
    render(<App />);

    const actions = Array.from(document.querySelectorAll(".hero-actions a"), (link) => link.textContent);
    expect(actions).toEqual(["View projects", "View publications", "View competition results"]);
    expect(screen.getByRole("complementary", { name: "Resume profile" })).toBeTruthy();
    expect(document.querySelector('.site img[src*="band-wall"]')).toBeNull();
    expect(document.querySelector(".research-polaroid")).toBeNull();
  });

  it("keeps every girl-band page behind the VOL password gate", () => {
    render(<App />);

    const minimalNavigation = Array.from(document.querySelectorAll(".site-header .nav-links a"), (link) => link.textContent?.trim());
    expect(minimalNavigation).toEqual(["Home", "Projects", "Publications", "Awards", "Tech Notes"]);

    fireEvent.click(screen.getByRole("button", { name: "Switch to the girl-band edition" }));

    expect(window.location.hash).toBe("#/space");
    expect(document.documentElement.dataset.theme).toBe("minimal");
    expect(screen.getByPlaceholderText("Enter invitation code")).toBeTruthy();
    expect(document.querySelector('.site img[src*="band-wall"]')).toBeNull();
  });

  it("reveals only the girl-band navigation after a valid VOL invitation", async () => {
    api.unlockPrivateSpace.mockResolvedValue({
      name: "Visitor",
      visitor_number: 2,
      is_owner: false,
      session_token: "visitor-token",
    });
    api.loadPrivateSpace.mockResolvedValue({
      visitor: {
        name: "Visitor",
        visitor_number: 2,
        visit_count: 1,
        is_owner: false,
      },
      entries: [],
      messages: [],
      playlist: [],
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Switch to the girl-band edition" }));
    fireEvent.change(screen.getByPlaceholderText("Enter invitation code"), { target: { value: "Visitor-example" } });
    fireEvent.click(screen.getByRole("button", { name: "Enter ↗" }));

    await waitFor(() => expect(window.location.hash).toBe("#/now"));
    expect(document.documentElement.dataset.theme).toBe("band");
    const bandNavigation = Array.from(document.querySelectorAll(".site-header .nav-links a"), (link) => link.textContent?.trim());
    expect(bandNavigation).toEqual(["Now✦", "Writing✒️", "Photography📷", "Music🎧", "Film note🎬"]);
    expect(screen.queryByRole("link", { name: /Editor/ })).toBeNull();
    expect(screen.queryByPlaceholderText("Enter invitation code")).toBeNull();
  });

  it("uses compact Chinese labels in the top navigation", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Switch to Chinese" }));

    expect(screen.getByRole("heading", { level: 1, name: "陈彧赟" })).toBeTruthy();
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

  it("defaults to VOL. 01 minimal and routes VOL through the private password gate", () => {
    document.documentElement.dataset.theme = "band";
    localStorage.setItem("yuyun-site-theme", "band");
    render(<App />);

    expect(document.documentElement.dataset.theme).toBe("minimal");
    expect(document.querySelector("main.site")?.getAttribute("data-theme")).toBe("minimal");
    const switcher = screen.getByRole("button", { name: "Switch to the girl-band edition" });
    expect(switcher.textContent).toBe("VOL. 01");

    fireEvent.click(switcher);

    expect(document.documentElement.dataset.theme).toBe("minimal");
    expect(window.location.hash).toBe("#/space");
    expect(screen.getByPlaceholderText("Enter invitation code")).toBeTruthy();
  });

  it("routes direct girl-band links through the private password gate", () => {
    window.location.hash = "#/now";
    const { unmount } = render(<App />);

    expect(document.documentElement.dataset.theme).toBe("minimal");
    expect(screen.getByPlaceholderText("Enter invitation code")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "What is playing lately." })).toBeNull();

    unmount();
    localStorage.clear();
    window.location.hash = "#/editor";
    render(<App />);

    expect(document.documentElement.dataset.theme).toBe("minimal");
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
    window.location.hash = "#/editor";
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
    window.location.hash = "#/now";
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
    window.location.hash = "#/writing";
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
        body: "# Opening\n\nIntro paragraph.\n\n## Results\n\n{{media:inline}}\n\n| Model | Score |\n| --- | ---: |\n| Baseline | 0.91 |",
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
    expect(screen.getByRole("navigation", { name: "Article outline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Opening" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Results" })).toBeTruthy();
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
    const showPicker = vi.fn();
    Object.defineProperty(window.HTMLInputElement.prototype, "showPicker", {
      configurable: true,
      value: showPicker,
    });
    sessionStorage.setItem("yuyun-private-space-session", "visitor-token");
    window.location.hash = "#/film";
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
    const summary = doubanLink.closest(".archive-entry__summary");
    expect(summary?.textContent).toContain("After the screening");

    const startDateInput = screen.getByLabelText("Start date");
    const endDateInput = screen.getByLabelText("End date");
    expect(startDateInput.getAttribute("type")).toBe("date");
    expect(endDateInput.getAttribute("type")).toBe("date");
    fireEvent.click(screen.getByRole("button", { name: "Open Start date calendar" }));
    expect(showPicker).toHaveBeenCalledOnce();

    fireEvent.change(startDateInput, { target: { value: "2026-01-01" } });
    expect(screen.getByRole("heading", { name: "A film note" })).toBeTruthy();

    fireEvent.change(startDateInput, { target: { value: "" } });
    fireEvent.change(endDateInput, { target: { value: "2025-12-31" } });
    expect(screen.queryByRole("heading", { name: "A film note" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Switch to Chinese" }));
    expect(screen.getByLabelText("起始日期").getAttribute("type")).toBe("date");
    expect((screen.getByLabelText("终止日期") as HTMLInputElement).value).toBe("2025-12-31");
    expect(screen.getAllByText("年月日").length).toBeGreaterThanOrEqual(1);
  });

  it("uses a plain writing font in the Markdown editor and keeps type controls contained", async () => {
    localStorage.setItem("yuyun-owner-console-session", "owner-token");
    window.location.hash = "#/editor";
    api.loadPrivateSpace.mockResolvedValue({
      visitor: { name: "Yuyun", visitor_number: 1, visit_count: 1, is_owner: true },
      entries: [],
      messages: [],
      playlist: [],
    });

    const { container } = render(<App />);
    await screen.findByText("Shape the archive.");
    const editor = container.querySelector(".space-editor__markdown-input");
    expect(editor).toBeTruthy();
    expect(container.querySelector(".space-editor__kind")?.classList.contains("space-editor__kind--contained")).toBe(true);
    expect(screen.getByText("yyyy/mm/dd")).toBeTruthy();
  });

  it("uses the creation date for undated visitor entries and keeps them filterable", async () => {
    sessionStorage.setItem("yuyun-private-space-session", "visitor-token");
    window.location.hash = "#/writing";
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

    expect(await screen.findByText("Writing · 2025/04/06")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2025-01-01" } });
    expect(screen.getByRole("heading", { name: "A saved fragment" })).toBeTruthy();
  });

  it("shows the visible invitation code and lets the owner delete or reset a visitor", async () => {
    const showPicker = vi.fn();
    Object.defineProperty(window.HTMLInputElement.prototype, "showPicker", {
      configurable: true,
      value: showPicker,
    });
    localStorage.setItem("yuyun-owner-console-session", "owner-token");
    window.location.hash = "#/admin";
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.loadAdminDashboard.mockResolvedValue({
      owner_name: "Yuyun",
      stats: {
        total_visitors: 1,
        active_visitors: 1,
        total_visits: 2,
        total_messages: 0,
      },
      invitations: [{
        id: "invite-1",
        label: "HuangRuiQi",
        is_active: true,
        expires_at: null,
        visit_count: 2,
        last_seen_at: "2026-08-13T09:12:00.000Z",
        created_at: "2026-08-12T08:00:00.000Z",
        code_display: "HuangRuiQi-AbCdEf1234567",
      }],
      events: [],
      messages: [],
    });

    render(<App />);

    expect(await screen.findByText("HuangRuiQi-AbCdEf1234567")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open Expires on calendar" }));
    expect(showPicker).toHaveBeenCalledOnce();
    api.resetVisitorInviteCode.mockResolvedValue({
      id: "invite-1",
      label: "HuangRuiQi",
      is_active: true,
      expires_at: null,
      visit_count: 2,
      last_seen_at: null,
      created_at: "2026-08-12T08:00:00.000Z",
      code_display: "HuangRuiQi-ZyXwVu9876543",
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete visitor" }));

    await waitFor(() => expect(api.deleteVisitorInvite).toHaveBeenCalledWith("owner-token", "invite-1"));

    fireEvent.click(screen.getByRole("button", { name: "Reset code" }));
    await waitFor(() => expect(api.resetVisitorInviteCode).toHaveBeenCalledWith(
      "owner-token",
      "invite-1",
      expect.stringMatching(/^HuangRuiQi-/),
    ));
    expect(await screen.findByText("HuangRuiQi-ZyXwVu9876543")).toBeTruthy();
  });

  it("lets the owner save a guestbook reply and shows that reply to the visitor", async () => {
    localStorage.setItem("yuyun-owner-console-session", "owner-token");
    window.location.hash = "#/admin";
    api.loadAdminDashboard.mockResolvedValue({
      owner_name: "Yuyun",
      stats: {
        total_visitors: 1,
        active_visitors: 1,
        total_visits: 1,
        total_messages: 1,
      },
      invitations: [],
      events: [],
      messages: [{
        id: "message-1",
        visitor_name: "Visitor",
        body: "Hello there",
        status: "visible",
        created_at: "2026-08-13T09:12:00.000Z",
        owner_reply: null,
        owner_replied_at: null,
      }],
    });
    api.setGuestbookMessageReply.mockResolvedValue({
      id: "message-1",
      visitor_name: "Visitor",
      body: "Hello there",
      status: "visible",
      created_at: "2026-08-13T09:12:00.000Z",
      owner_reply: "See you soon",
      owner_replied_at: "2026-08-13T10:00:00.000Z",
    });

    render(<App />);
    fireEvent.change(await screen.findByPlaceholderText("Write a reply to this visitor..."), {
      target: { value: "See you soon" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save reply" }));

    await waitFor(() => expect(api.setGuestbookMessageReply).toHaveBeenCalledWith("owner-token", "message-1", "See you soon"));
  });

  it("renders visitor replies beneath the original guestbook note", async () => {
    sessionStorage.setItem("yuyun-private-space-session", "visitor-token");
    window.location.hash = "#/now";
    api.loadPrivateSpace.mockResolvedValue({
      visitor: {
        name: "Visitor",
        visitor_number: 2,
        visit_count: 1,
        is_owner: false,
      },
      entries: [],
      playlist: [],
      messages: [{
        id: "message-one",
        visitor_name: "Visitor",
        body: "I was here.",
        created_at: "2026-08-13T05:00:00.000Z",
        owner_reply: "Reply noted.",
        owner_replied_at: "2026-08-13T06:00:00.000Z",
      }],
    });

    render(<App />);

    expect(await screen.findByText("Reply from Yuyun")).toBeTruthy();
    expect(screen.getByText("Reply noted.")).toBeTruthy();
  });

  it("shows every visitor guestbook note to the owner on the ordinary Now page", async () => {
    localStorage.setItem("yuyun-owner-console-session", "owner-token");
    window.location.hash = "#/now";
    api.loadPrivateSpace.mockResolvedValue({
      visitor: { name: "Yuyun", visitor_number: 1, visit_count: 1, is_owner: true },
      entries: [],
      playlist: [],
      messages: [{
        id: "message-a",
        visitor_name: "HuangRuiQi",
        body: "First visitor note",
        created_at: "2026-08-18T09:00:00.000Z",
      }, {
        id: "message-b",
        visitor_name: "Another friend",
        body: "Second visitor note",
        created_at: "2026-08-18T10:00:00.000Z",
      }],
    });

    render(<App />);

    expect(await screen.findByText("All pinned notes")).toBeTruthy();
    expect(screen.getByText("HuangRuiQi")).toBeTruthy();
    expect(screen.getByText("Another friend")).toBeTruthy();

    api.setGuestbookMessageReply.mockResolvedValue({
      id: "message-a",
      visitor_name: "HuangRuiQi",
      body: "First visitor note",
      created_at: "2026-08-18T09:00:00.000Z",
      owner_reply: "I saw this.",
      owner_replied_at: "2026-08-18T11:00:00.000Z",
    });
    fireEvent.change(screen.getAllByPlaceholderText("Write a reply to this visitor...")[0], {
      target: { value: "I saw this." },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save reply" })[0]);

    await waitFor(() => expect(api.setGuestbookMessageReply).toHaveBeenCalledWith(
      "owner-token",
      "message-a",
      "I saw this.",
    ));
    expect(await screen.findByText("Reply from Yuyun")).toBeTruthy();
    expect(document.querySelector(".guestbook-note__reply p")?.textContent).toBe("I saw this.");
  });

  it("keeps the default playlist until a visitor explicitly starts an article soundtrack", async () => {
    sessionStorage.setItem("yuyun-private-space-session", "visitor-token");
    window.location.hash = "#/writing";
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
    expect(container.querySelector("audio")).toBeNull();
    expect(window.HTMLMediaElement.prototype.play).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Play this note's soundtrack: Entry song" }));
    await waitFor(() => expect(container.querySelector("audio")).toBeTruthy());
    const audio = container.querySelector("audio");
    await waitFor(() => expect(audio?.getAttribute("src")).toBe("/audio/entry.mp3"));
    expect(screen.getByRole("button", { name: "Return to playlist" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Return to playlist" }));
    await waitFor(() => expect(audio?.getAttribute("src")).toBe("/audio/default.mp3"));
  });

  it("starts the full playlist from a clicked record and cycles playback modes", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    sessionStorage.setItem("yuyun-private-space-session", "visitor-token");
    window.location.hash = "#/music";
    api.loadPrivateSpace.mockResolvedValue({
      visitor: { name: "Visitor", visitor_number: 2, visit_count: 1, is_owner: false },
      entries: [],
      messages: [],
      playlist: [
        {
          id: "record-one",
          title: "Drive Thru",
          artist: "Ivoris",
          album: "Drive Thru",
          description: "Late-night repeat.",
          audio_url: "/audio/drive-thru.mp3",
          cover_url: "/covers/drive-thru.jpg",
          external_url: "https://music.163.com/song?id=1954372700",
          is_active: true,
          sort_order: 0,
        },
        {
          id: "record-two",
          title: "Song Two",
          artist: "Band Two",
          audio_url: "/audio/two.mp3",
          cover_url: null,
          external_url: null,
          is_active: true,
          sort_order: 1,
        },
        {
          id: "record-three",
          title: "Song Three",
          artist: "Band Three",
          audio_url: "/audio/three.mp3",
          cover_url: null,
          external_url: null,
          is_active: true,
          sort_order: 2,
        },
      ],
    });

    const { container } = render(<App />);
    const record = await screen.findByRole("button", { name: "Play track: Drive Thru" });
    expect(container.querySelector("audio")).toBeNull();
    expect(window.HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(screen.getByText("Album · Drive Thru")).toBeTruthy();
    expect(screen.getByText("Late-night repeat.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /NetEase Music/ }).getAttribute("href"))
      .toBe("https://music.163.com/song?id=1954372700");

    fireEvent.click(record);
    await waitFor(() => expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1));
    const audio = container.querySelector("audio");
    expect(audio?.getAttribute("src")).toBe("/audio/drive-thru.mp3");

    fireEvent.click(screen.getByRole("button", { name: "Minimize player" }));
    expect(screen.getByRole("button", { name: "Restore player" })).toBeTruthy();
    expect(screen.queryByRole("complementary", { name: "Now playing" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Restore player" }));
    expect(screen.getByRole("complementary", { name: "Now playing" })).toBeTruthy();

    fireEvent.ended(audio as HTMLAudioElement);
    await waitFor(() => expect(audio?.getAttribute("src")).toBe("/audio/three.mp3"));
    fireEvent.ended(audio as HTMLAudioElement);
    await waitFor(() => expect(audio?.getAttribute("src")).toBe("/audio/two.mp3"));

    fireEvent.click(screen.getByRole("button", { name: "Shuffle" }));
    expect(screen.getByRole("button", { name: "Play in order" })).toBeTruthy();
    fireEvent.ended(audio as HTMLAudioElement);
    await waitFor(() => expect(audio?.getAttribute("src")).toBe("/audio/three.mp3"));

    fireEvent.click(screen.getByRole("button", { name: "Play in order" }));
    expect(screen.getByRole("button", { name: "Repeat one" })).toBeTruthy();
    fireEvent.ended(audio as HTMLAudioElement);
    expect(audio?.getAttribute("src")).toBe("/audio/three.mp3");

    randomSpy.mockRestore();
  });

  it("lets an invited visitor like and comment on an article without duplicate submissions", async () => {
    sessionStorage.setItem("yuyun-private-space-session", "visitor-token");
    window.location.hash = "#/writing";
    api.loadPrivateSpace.mockResolvedValue({
      visitor: { name: "Visitor", visitor_number: 2, visit_count: 1, is_owner: false },
      playlist: [],
      messages: [],
      entries: [{
        id: "entry-one",
        kind: "writing",
        title: "A shared note",
        excerpt: "A complete short line",
        body: "# Opening\n\nArticle body.",
        image_url: null,
        external_url: null,
        event_date: "2026-08-17",
        display_date: "2026-08-17",
        music_track_id: null,
        is_published: true,
        is_public: false,
        like_count: 2,
        liked_by_visitor: false,
        comments: [],
      }],
    });
    api.togglePrivateEntryLike.mockResolvedValue({
      entry_id: "entry-one",
      like_count: 3,
      liked_by_visitor: true,
    });
    api.postPrivateEntryComment.mockResolvedValue({
      id: "comment-one",
      entry_id: "entry-one",
      visitor_name: "Visitor",
      body: "I read this.",
      visibility: "private",
      is_own: true,
      created_at: "2026-08-18T08:00:00.000Z",
    });

    render(<App />);
    await screen.findByRole("heading", { name: "A shared note" });
    fireEvent.click(screen.getByRole("button", { name: "Like · 2" }));
    await waitFor(() => expect(api.togglePrivateEntryLike).toHaveBeenCalledWith("visitor-token", "entry-one"));
    const likedButton = screen.getByRole("button", { name: "Unlike · 3" });
    expect(likedButton.textContent).toContain("Liked");
    expect(likedButton.textContent).not.toContain("Unlike");

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    fireEvent.click(screen.getByRole("radio", { name: "Only me + Yuyun" }));
    fireEvent.change(screen.getByPlaceholderText("Leave a comment on this article..."), {
      target: { value: "I read this." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Post comment" }));

    await waitFor(() => expect(api.postPrivateEntryComment).toHaveBeenCalledWith(
      "visitor-token",
      "entry-one",
      "I read this.",
      "private",
      expect.any(String),
    ));
    expect(await screen.findByText("I read this.")).toBeTruthy();
    expect(screen.getByText("Private comment")).toBeTruthy();
    expect(api.postPrivateEntryComment).toHaveBeenCalledTimes(1);
  });

  it("saves Tech Notes with a separate VOL.01 publishing choice", async () => {
    localStorage.setItem("yuyun-owner-console-session", "owner-token");
    window.location.hash = "#/editor";
    api.loadPrivateSpace.mockResolvedValue({
      visitor: { name: "Yuyun", visitor_number: 1, visit_count: 1, is_owner: true },
      entries: [],
      playlist: [],
      messages: [],
    });
    api.savePrivateEntry.mockResolvedValue({
      id: "tech-one",
      kind: "tech",
      title: "Evaluation notes",
      excerpt: "How I compare models",
      body: "# Evaluation",
      image_url: null,
      external_url: null,
      event_date: null,
      display_date: "2026-08-18",
      music_track_id: null,
      is_published: false,
      is_public: true,
      like_count: 0,
      liked_by_visitor: false,
      comments: [],
    });

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Tech Note" }));
    fireEvent.change(screen.getByPlaceholderText("A title for this fragment"), { target: { value: "Evaluation notes" } });
    fireEvent.click(screen.getByLabelText("Publish this Tech Note to VOL.01"));
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    await waitFor(() => expect(api.savePrivateEntry).toHaveBeenCalledWith(
      "owner-token",
      expect.objectContaining({ kind: "tech", title: "Evaluation notes", is_public: true }),
    ));
  });

  it("renders published Tech Notes on VOL.01 with the article card and outline", async () => {
    window.location.hash = "#/notes";
    api.loadPublicTechnicalNotes.mockResolvedValue([{
      id: "public-tech-one",
      kind: "tech",
      title: "Public evaluation notes",
      excerpt: "A practical model comparison.",
      body: "# Setup\n\n## Results\n\nThe result.",
      image_url: null,
      external_url: null,
      event_date: "2026-08-18",
      display_date: "2026-08-18",
      music_track_id: null,
      is_published: false,
      is_public: true,
      like_count: 0,
      liked_by_visitor: false,
      comments: [],
    }]);

    render(<App />);
    const title = await screen.findByRole("heading", { name: "Public evaluation notes" });
    expect(title.closest(".public-note-card")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(screen.getByRole("navigation", { name: "Article outline" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Setup" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Results" })).toBeTruthy();
  });
});
