/**
 * @vitest-environment happy-dom
 */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AttestationHistory from "@/components/AttestationHistory";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    children,
  LineChart: ({ children }: { children: React.ReactNode }) => children,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Line: () => null,
}));

function jsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  } as Response;
}

function fetchMock() {
  return global.fetch as unknown as ReturnType<typeof vi.fn>;
}

function mockMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("AttestationHistory", () => {
  beforeEach(() => {
    mockMatchMedia();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows the loading state while attestation records are requested", async () => {
    let resolveFetch: (response: Response) => void = () => {};
    fetchMock().mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    render(<AttestationHistory commitmentId="CMT-123" />);

    expect(
      screen.getByLabelText("Loading attestation history"),
    ).toBeInTheDocument();

    resolveFetch(
      jsonResponse({
        success: true,
        data: { attestations: [] },
      }),
    );

    expect(
      await screen.findByText(
        "No attestations recorded for this commitment yet.",
      ),
    ).toBeInTheDocument();
  });

  it("filters records by commitment id, sorts them chronologically, and renders scores", async () => {
    fetchMock().mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: {
          attestations: [
            {
              id: "other",
              commitmentId: "CMT-999",
              kind: "health_check",
              observedAt: "2026-06-21T08:00:00Z",
              details: { complianceScore: 88 },
            },
            {
              id: "latest",
              commitmentId: "CMT-123",
              kind: "drawdown",
              title: "Drawdown threshold check",
              observedAt: "2026-06-21T10:00:00Z",
              attestor: "GABCDEFGHIJKLMNOPQRSTUVWXYZ23456789",
              details: {
                complianceScore: 0,
                notes: "Drawdown moved beyond the allowed band.",
              },
            },
            {
              id: "first",
              commitmentId: "CMT-123",
              kind: "health_check",
              title: "Daily health check",
              observedAt: "2026-06-21T09:00:00Z",
              verifiedBy: "GATTESTOR0000000000000000000000000000000001",
              details: { complianceScore: 100 },
            },
          ],
        },
      }),
    );

    render(<AttestationHistory commitmentId="CMT-123" />);

    expect(await screen.findByText("Daily health check")).toBeInTheDocument();
    expect(screen.getByText("Drawdown threshold check")).toBeInTheDocument();
    expect(screen.queryByText("CMT-999")).not.toBeInTheDocument();

    const renderedTitles = screen
      .getAllByRole("listitem")
      .map((item) => item.textContent ?? "");
    expect(renderedTitles[0]).toContain("Daily health check");
    expect(renderedTitles[1]).toContain("Drawdown threshold check");

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("GATTES...0001")).toBeInTheDocument();
    expect(screen.getByText("GABCDE...6789")).toBeInTheDocument();
    expect(screen.getByText("Pass")).toBeInTheDocument();
    expect(screen.getByText("Violation")).toBeInTheDocument();
    expect(screen.getByTestId("attestation-trend-chart")).toBeInTheDocument();
  });

  it("renders an empty state when the API has no matching records", async () => {
    fetchMock().mockResolvedValueOnce(
      jsonResponse({
        attestations: [
          {
            id: "other",
            commitmentId: "CMT-OTHER",
            observedAt: "2026-06-21T10:00:00Z",
          },
        ],
      }),
    );

    render(<AttestationHistory commitmentId="CMT-123" />);

    expect(
      await screen.findByText(
        "No attestations recorded for this commitment yet.",
      ),
    ).toBeInTheDocument();
  });

  it("renders a retryable error state when the request fails", async () => {
    fetchMock()
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: {
            attestations: [
              {
                id: "recovered",
                commitmentId: "CMT-123",
                kind: "health_check",
                title: "Recovered attestation",
                observedAt: "2026-06-21T09:00:00Z",
                details: { complianceScore: 95 },
              },
            ],
          },
        }),
      );

    render(<AttestationHistory commitmentId="CMT-123" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network unavailable",
    );

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(
      await screen.findByText("Recovered attestation"),
    ).toBeInTheDocument();
  });

  it("handles records without numeric compliance scores", async () => {
    fetchMock().mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: {
          attestations: [
            {
              id: "manual",
              commitmentId: "CMT-123",
              kind: "manual_review",
              observedAt: "2026-06-21T09:00:00Z",
              attestorAddress: "GMANUALREVIEW00000000000000000000000000001",
              description: "Manual reviewer left a note.",
            },
          ],
        },
      }),
    );

    render(<AttestationHistory commitmentId="CMT-123" />);

    expect(
      await screen.findByText("Manual Review attestation"),
    ).toBeInTheDocument();
    expect(screen.getByText("No score")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No numeric compliance scores are available for charting.",
      ),
    ).toBeInTheDocument();
  });
});
