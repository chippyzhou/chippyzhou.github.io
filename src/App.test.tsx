import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const api = vi.hoisted(() => ({
  createVisitorInvite: vi.fn(),
  deletePrivateEntry: vi.fn(),
  loadAdminDashboard: vi.fn(),
  loadPrivateSpace: vi.fn(),
  postGuestbookMessage: vi.fn(),
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

  it("places academic work between the project and competition home actions", () => {
    render(<App />);

    const actions = Array.from(document.querySelectorAll(".hero-actions a"), (link) => link.textContent);
    expect(actions).toEqual(["Open field notes", "Academic work", "Read the setlist"]);
    expect(document.querySelector(".research-polaroid img")?.getAttribute("src")).toContain("band-wall/mygo-banner.jpg");
  });

  it("places technical notes directly before the gallery in the top navigation", () => {
    render(<App />);

    const navigation = Array.from(document.querySelectorAll(".site-header .nav-links a"), (link) => link.textContent?.trim());
    expect(navigation.indexOf("Tech Notes📓")).toBe(navigation.indexOf("Gallery🎹") - 1);
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

  it("automatically retries the first transient entry save with the same entry id", async () => {
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
    expect(firstId).toBeNull();
    expect(secondId).toBe(firstId);
    expect(await screen.findByText("Saved as a private draft.")).toBeTruthy();
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
        body: "| Model | Score |\n| --- | ---: |\n| Baseline | 0.91 |",
        image_url: null,
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

    expect(container.querySelector(".archive-entry")?.classList.contains("is-expanded")).toBe(true);
    expect(container.querySelector("table")).toBeTruthy();
  });
});
