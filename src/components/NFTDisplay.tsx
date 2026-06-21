"use client";

/* eslint-disable @next/next/no-img-element -- NFT metadata images can come from arbitrary external domains, so this component keeps plain img fallback behavior. */

import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  ExternalLink,
  ImageOff,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

interface NFTDisplayProps {
  tokenId: string;
  metadata?: Record<string, unknown>;
  ownerAddress?: string;
  contractAddress?: string;
  mintDate?: string;
  riskProfile?: string;
  amount?: string;
  asset?: string;
  maturityDate?: string;
  complianceScore?: number;
  attestationHref?: string;
}

interface DisplayMetadata {
  imageUrl?: string;
  name: string;
  description?: string;
  owner?: string;
  contract?: string;
  mintDate?: string;
  riskProfile?: string;
  amount?: string;
  asset?: string;
  maturityDate?: string;
  complianceScore?: number;
}

function readString(
  source: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined {
  if (!source) return undefined;

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  return undefined;
}

function readNumber(
  source: Record<string, unknown> | undefined,
  keys: string[],
): number | undefined {
  if (!source) return undefined;

  for (const key of keys) {
    const value = source[key];
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

function truncateMiddle(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function formatFallbackSeed(tokenId: string): string {
  return (
    tokenId
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-3)
      .toUpperCase() || "NFT"
  );
}

function buildDisplayMetadata({
  tokenId,
  metadata,
  ownerAddress,
  contractAddress,
  mintDate,
  riskProfile,
  amount,
  asset,
  maturityDate,
  complianceScore,
}: NFTDisplayProps): DisplayMetadata {
  return {
    imageUrl: readString(metadata, [
      "image",
      "imageUrl",
      "image_url",
      "artworkUrl",
      "artwork_url",
    ]),
    name:
      readString(metadata, ["name", "title"]) ?? `Commitment NFT #${tokenId}`,
    description: readString(metadata, ["description", "summary"]),
    owner:
      ownerAddress ??
      readString(metadata, ["owner", "ownerAddress", "owner_address"]),
    contract:
      contractAddress ??
      readString(metadata, ["contract", "contractAddress", "contract_address"]),
    mintDate:
      mintDate ??
      readString(metadata, ["mintDate", "mintedAt", "mint_date", "createdAt"]),
    riskProfile:
      riskProfile ??
      readString(metadata, ["riskProfile", "risk_profile", "risk"]),
    amount: amount ?? readString(metadata, ["amount", "principal"]),
    asset: asset ?? readString(metadata, ["asset", "currency"]),
    maturityDate:
      maturityDate ??
      readString(metadata, ["maturityDate", "maturity", "expiresAt"]),
    complianceScore:
      complianceScore ??
      readNumber(metadata, ["complianceScore", "compliance_score"]),
  };
}

function MetadataRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-3 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span
        className={`min-w-0 truncate text-right text-sm font-medium text-white ${
          mono ? "font-mono" : ""
        }`}
        title={value}
      >
        {mono ? truncateMiddle(value) : value}
      </span>
    </div>
  );
}

export default function NFTDisplay(props: NFTDisplayProps) {
  const { tokenId, attestationHref = "#attestation-history" } = props;
  const [imageFailed, setImageFailed] = useState(false);
  const display = useMemo(() => buildDisplayMetadata(props), [props]);
  const shouldRenderImage = Boolean(display.imageUrl) && !imageFailed;
  const commitmentAmount =
    display.amount && display.asset
      ? `${display.amount} ${display.asset}`
      : (display.amount ?? display.asset);

  return (
    <section
      aria-labelledby="nft-display-title"
      className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f14] text-white"
    >
      <div className="grid gap-0 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="relative min-h-[280px] border-b border-white/10 bg-linear-to-br from-slate-900 via-[#111827] to-black md:border-b-0 md:border-r">
          {shouldRenderImage ? (
            <img
              alt={`${display.name} artwork`}
              className="h-full min-h-[280px] w-full object-cover"
              onError={() => setImageFailed(true)}
              src={display.imageUrl}
            />
          ) : (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border border-teal-400/40 bg-teal-400/10 shadow-[0_0_30px_rgba(45,212,191,0.2)]">
                {display.imageUrl ? (
                  <ImageOff className="h-10 w-10 text-teal-200" />
                ) : (
                  <span className="text-3xl font-bold text-teal-200">
                    {formatFallbackSeed(tokenId)}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">
                  Commitment NFT
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-white">
                  #{truncateMiddle(tokenId)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6 p-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-300">
              Commitment NFT
            </p>
            <h2 id="nft-display-title" className="mt-2 text-2xl font-bold">
              {display.name}
            </h2>
            {display.description && (
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {display.description}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <WalletCards className="mb-3 h-5 w-5 text-teal-300" />
              <p className="text-xs uppercase text-slate-500">Token</p>
              <p className="mt-1 truncate font-mono text-sm text-white">
                {truncateMiddle(tokenId)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <ShieldCheck className="mb-3 h-5 w-5 text-green-300" />
              <p className="text-xs uppercase text-slate-500">Compliance</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {typeof display.complianceScore === "number"
                  ? `${display.complianceScore}%`
                  : "Not scored"}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <CalendarDays className="mb-3 h-5 w-5 text-purple-300" />
              <p className="text-xs uppercase text-slate-500">Maturity</p>
              <p className="mt-1 truncate text-sm font-semibold text-white">
                {display.maturityDate ?? "Not set"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0f1115] p-5">
            <h3 className="mb-2 text-sm font-semibold">NFT Metadata</h3>
            <MetadataRow label="Token ID" value={tokenId} mono />
            {display.owner && (
              <MetadataRow label="Owner" value={display.owner} mono />
            )}
            {display.contract && (
              <MetadataRow label="Contract" value={display.contract} mono />
            )}
            {display.mintDate && (
              <MetadataRow label="Mint Date" value={display.mintDate} />
            )}
            {display.riskProfile && (
              <MetadataRow label="Risk Profile" value={display.riskProfile} />
            )}
            {commitmentAmount && (
              <MetadataRow label="Commitment" value={commitmentAmount} />
            )}
          </div>

          <a
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-teal-400/30 bg-teal-400/10 px-4 py-3 text-sm font-semibold text-teal-100 transition hover:bg-teal-400/20"
            href={attestationHref}
          >
            <ExternalLink className="h-4 w-4" />
            View attestation history
          </a>
        </div>
      </div>
    </section>
  );
}
