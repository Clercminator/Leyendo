function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

export function buildMercadoPagoSignatureManifest(params: {
  requestId?: string | null;
  requestUrl: string;
  timestamp: string;
}) {
  const url = new URL(params.requestUrl);
  const dataId =
    asString(url.searchParams.get("data.id"))?.toLowerCase() ?? null;
  const requestId = asString(params.requestId);
  const manifestParts: string[] = [];

  if (dataId) {
    manifestParts.push(`id:${dataId};`);
  }

  if (requestId) {
    manifestParts.push(`request-id:${requestId};`);
  }

  manifestParts.push(`ts:${params.timestamp};`);

  return manifestParts.join("");
}

export function resolveMercadoPagoWebhookResourceId(params: {
  bodyDataId?: string | number;
  requestUrl: string;
}) {
  const url = new URL(params.requestUrl);

  return (
    asString(url.searchParams.get("data.id")) ??
    asString(url.searchParams.get("id")) ??
    asString(params.bodyDataId)
  );
}
