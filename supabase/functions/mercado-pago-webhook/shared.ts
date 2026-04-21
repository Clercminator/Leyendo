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

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    const normalized = asString(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function buildMercadoPagoSignatureManifest(args: {
  requestId?: string | null;
  requestUrl: string;
  timestamp: string;
}) {
  const requestUrl = new URL(args.requestUrl);
  const resourceId =
    asString(requestUrl.searchParams.get("data.id"))?.toLowerCase() ?? null;
  const requestId = asString(args.requestId);
  const manifestParts: string[] = [];

  if (resourceId) {
    manifestParts.push(`id:${resourceId};`);
  }

  if (requestId) {
    manifestParts.push(`request-id:${requestId};`);
  }

  manifestParts.push(`ts:${args.timestamp};`);
  return manifestParts.join("");
}

export function resolveMercadoPagoWebhookResourceId(args: {
  bodyDataId?: string | number;
  requestUrl: string;
}) {
  const requestUrl = new URL(args.requestUrl);

  return pickString(
    requestUrl.searchParams.get("data.id"),
    requestUrl.searchParams.get("id"),
    args.bodyDataId,
  );
}
