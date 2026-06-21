"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import type { Attestation } from "@/lib/types/domain";

interface AttestationHistoryProps {
  commitmentId: string;
}

type LoadState = "idle" | "loading" | "loaded" | "error";

interface AttestationHistoryItem {
  id: string;
  commitmentId: string;
  kind: string;
  observedAt: string;
  attestor: string;
  complianceScore?: number;
  violation: boolean;
  title: string;
  description?: string;
  txHash?: string;
}

interface AttestationApiResponse {
  success?: boolean;
  data?: {
    attestations?: unknown[];
  };
  attestations?: unknown[];
}

const VIOLATION_THRESHOLD = 70;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readNestedNumber(
  record: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.min(100, Math.round(value)));
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.min(100, Math.round(parsed)));
      }
    }
  }

  return undefined;
}

function readString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  return undefined;
}

function formatKind(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTrendDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function truncateAddress(value: string): string {
  if (!value || value === "Unknown attestor") return value;
  if (value.length <= 14) return value;

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function normalizeAttestation(value: unknown): AttestationHistoryItem | null {
  if (!isRecord(value)) return null;

  const details = isRecord(value.details) ? value.details : {};
  const data = isRecord(value.data) ? value.data : {};
  const commitmentId = readString(value, ["commitmentId", "commitment_id"]);
  const observedAt =
    readString(value, ["observedAt", "timestamp", "recordedAt", "createdAt"]) ??
    readString(details, ["timestamp", "observedAt"]) ??
    new Date(0).toISOString();

  if (!commitmentId) return null;

  const kind =
    readString(value, ["kind", "attestationType", "type"]) ??
    readString(details, ["type", "attestationType"]) ??
    "attestation";
  const complianceScore =
    readNestedNumber(value, ["complianceScore", "compliance_score"]) ??
    readNestedNumber(details, ["complianceScore", "compliance_score"]) ??
    readNestedNumber(data, ["complianceScore", "compliance_score"]);
  const explicitViolation =
    value.violation === true ||
    details.violation === true ||
    value.verdict === "fail" ||
    value.severity === "violation" ||
    details.severity === "violation";

  return {
    id:
      readString(value, ["id", "attestationId", "attestation_id"]) ??
      `${commitmentId}:${observedAt}:${kind}`,
    commitmentId,
    kind,
    observedAt,
    attestor:
      readString(value, ["attestor", "attestorAddress", "verifiedBy"]) ??
      readString(details, ["attestor", "attestorAddress", "verifiedBy"]) ??
      "Unknown attestor",
    complianceScore,
    violation:
      explicitViolation ||
      (typeof complianceScore === "number" &&
        complianceScore < VIOLATION_THRESHOLD),
    title: readString(value, ["title"]) ?? `${formatKind(kind)} attestation`,
    description:
      readString(value, ["description"]) ??
      readString(details, ["notes", "reason"]),
    txHash: readString(value, ["txHash", "transactionHash"]),
  };
}

function extractAttestations(response: AttestationApiResponse): unknown[] {
  if (Array.isArray(response.data?.attestations)) {
    return response.data.attestations;
  }

  if (Array.isArray(response.attestations)) {
    return response.attestations;
  }

  return [];
}

export default function AttestationHistory({
  commitmentId,
}: AttestationHistoryProps) {
  const [items, setItems] = useState<AttestationHistoryItem[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const loadAttestations = useCallback(async () => {
    setState("loading");
    setError(null);

    try {
      const response = await fetch(
        `/api/attestations?commitmentId=${encodeURIComponent(commitmentId)}`,
      );

      if (!response.ok) {
        throw new Error("Unable to load attestation history.");
      }

      const payload = (await response.json()) as AttestationApiResponse;
      const normalized = extractAttestations(payload)
        .map((entry) => normalizeAttestation(entry as Attestation))
        .filter((entry): entry is AttestationHistoryItem => Boolean(entry))
        .filter((entry) => entry.commitmentId === commitmentId)
        .sort(
          (a, b) =>
            new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime(),
        );

      setItems(normalized);
      setState("loaded");
    } catch (err) {
      setItems([]);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load attestation history.",
      );
      setState("error");
    }
  }, [commitmentId]);

  useEffect(() => {
    void loadAttestations();
  }, [loadAttestations]);

  const trendData = useMemo(
    () =>
      items
        .filter((item) => typeof item.complianceScore === "number")
        .map((item) => ({
          date: formatTrendDate(item.observedAt),
          complianceScore: item.complianceScore ?? 0,
        })),
    [items],
  );

  return (
    <section
      aria-labelledby="attestation-history-title"
      className="rounded-2xl border border-[#222] bg-[#0a0a0a] p-5 text-white"
    >
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="attestation-history-title" className="text-xl font-semibold">
            Attestation History
          </h2>
          <p className="mt-1 text-sm text-[#99a1af]">
            Commitment {commitmentId}
          </p>
        </div>
        <span className="rounded-full border border-[#263238] bg-[#111] px-3 py-1 text-xs font-medium text-[#99a1af]">
          Violation threshold: below {VIOLATION_THRESHOLD}
        </span>
      </div>

      {state === "loading" && (
        <div aria-label="Loading attestation history" className="space-y-4">
          <Skeleton height={190} rounded="xl" />
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-[#222] bg-[#111] p-4"
            >
              <Skeleton width={180} height={20} className="mb-3" />
              <Skeleton width="80%" height={16} className="mb-2" />
              <Skeleton width="55%" height={16} />
            </div>
          ))}
        </div>
      )}

      {state === "error" && (
        <div
          role="alert"
          className="rounded-xl border border-[#4a2a2a] bg-[#180d0d] p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-[#f87171]" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[#fecaca]">{error}</p>
              <p className="mt-1 text-sm text-[#fca5a5]">
                The timeline is unavailable, but the commitment page can stay
                usable.
              </p>
            </div>
            <button
              type="button"
              onClick={loadAttestations}
              className="inline-flex items-center gap-2 rounded-lg border border-[#7f1d1d] px-3 py-2 text-sm font-medium text-[#fecaca] transition hover:bg-[#2a1111]"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      )}

      {state === "loaded" && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#333] bg-[#111] p-6 text-center">
          <p className="font-medium text-white">
            No attestations recorded for this commitment yet.
          </p>
          <p className="mt-2 text-sm text-[#99a1af]">
            New health checks and rule events will appear here once they are
            recorded.
          </p>
        </div>
      )}

      {state === "loaded" && items.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div
            data-testid="attestation-trend-chart"
            className="min-h-[260px] rounded-xl border border-[#222] bg-[#111] p-4"
          >
            <div className="mb-4">
              <h3 className="font-semibold">Compliance trend</h3>
              <p className="text-sm text-[#99a1af]">
                Score movement across recorded attestations.
              </p>
            </div>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={trendData}>
                  <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    stroke="#666"
                    tick={{ fill: "#99a1af", fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#666"
                    tick={{ fill: "#99a1af", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Line
                    dataKey="complianceScore"
                    dot={{ fill: "#4ade80", r: 4 }}
                    stroke="#4ade80"
                    strokeWidth={2}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="rounded-lg border border-[#222] bg-[#0a0a0a] p-4 text-sm text-[#99a1af]">
                No numeric compliance scores are available for charting.
              </p>
            )}
          </div>

          <ol className="space-y-3" aria-label="Attestation timeline">
            {items.map((item) => {
              const scoreLabel =
                typeof item.complianceScore === "number"
                  ? `${item.complianceScore}%`
                  : "No score";

              return (
                <li
                  key={item.id}
                  className="rounded-xl border border-[#222] bg-[#111] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-[#99a1af]">
                        {formatTimestamp(item.observedAt)}
                      </p>
                      <h3 className="mt-1 font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm text-[#99a1af]">
                        {formatKind(item.kind)} by{" "}
                        <span className="font-mono text-[#d1d5db]">
                          {truncateAddress(item.attestor)}
                        </span>
                      </p>
                      {item.description && (
                        <p className="mt-2 text-sm text-[#d1d5db]">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-none items-center gap-2">
                      <span className="rounded-full border border-[#333] px-3 py-1 text-sm font-semibold">
                        {scoreLabel}
                      </span>
                      <span
                        className={
                          item.violation
                            ? "inline-flex items-center gap-1 rounded-full border border-[#7f1d1d] bg-[#2a1111] px-3 py-1 text-sm font-medium text-[#fca5a5]"
                            : "inline-flex items-center gap-1 rounded-full border border-[#14532d] bg-[#102016] px-3 py-1 text-sm font-medium text-[#86efac]"
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {item.violation ? "Violation" : "Pass"}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
