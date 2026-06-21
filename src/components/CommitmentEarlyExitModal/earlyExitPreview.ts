export interface EarlyExitPreviewApiData {
  principal: number | string;
  penaltyPercent: number | string;
  penaltyAmount: number | string;
  netRefund: number | string;
}

export interface EarlyExitPreviewSummary {
  penaltyPercent: string;
  penaltyAmount: string;
  netReceiveAmount: string;
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: {
    message?: string;
  };
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 6,
  });
}

function formatAssetAmount(value: number | string, asset: string): string {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return `${formatNumber(numericValue)} ${asset}`;
  }

  return `${value} ${asset}`;
}

export function formatEarlyExitPreview(
  preview: EarlyExitPreviewApiData,
  asset: string,
): EarlyExitPreviewSummary {
  const numericPenaltyPercent = Number(preview.penaltyPercent);

  return {
    penaltyPercent: Number.isFinite(numericPenaltyPercent)
      ? `${formatNumber(numericPenaltyPercent)}%`
      : `${preview.penaltyPercent}%`,
    penaltyAmount: formatAssetAmount(preview.penaltyAmount, asset),
    netReceiveAmount: formatAssetAmount(preview.netRefund, asset),
  };
}

export async function fetchEarlyExitPreviewSummary(
  commitmentId: string,
  asset: string,
  fetcher: typeof fetch = fetch,
): Promise<EarlyExitPreviewSummary> {
  const response = await fetcher(
    `/api/commitments/${encodeURIComponent(commitmentId)}/early-exit/preview`,
  );

  if (!response.ok) {
    throw new Error(`Live preview failed with status ${response.status}`);
  }

  const payload = (await response.json()) as
    | ApiEnvelope<EarlyExitPreviewApiData>
    | EarlyExitPreviewApiData;

  if ("success" in payload) {
    if (payload.success === false) {
      throw new Error(
        payload.error?.message ?? "Live preview returned an error",
      );
    }

    if (!payload.data) {
      throw new Error("Live preview response did not include data");
    }

    return formatEarlyExitPreview(payload.data, asset);
  }

  return formatEarlyExitPreview(payload, asset);
}
