import { cleanup, render, screen } from "@testing-library/react";
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
}));

function pendingRequest<T>() {
  return new Promise<T>(() => undefined);
}

describe("owner session restoration", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.hash = "#/";
    vi.clearAllMocks();
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

    const heading = screen.getByRole("heading", { name: "Meritorious Winner · Top 7%" });
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
});
