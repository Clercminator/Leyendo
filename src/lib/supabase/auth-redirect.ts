const AUTH_CALLBACK_PATH = "/auth/callback";
const DEFAULT_POST_AUTH_PATH = "/account";

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}

function resolveOrigin(currentOrigin?: string) {
  const explicitOrigin = currentOrigin?.trim();
  if (explicitOrigin) {
    return normalizeOrigin(explicitOrigin);
  }

  if (typeof window === "undefined") {
    return undefined;
  }

  return normalizeOrigin(window.location.origin);
}

export function getSafePostAuthRedirectPath(
  redirectTo?: string | null,
  currentOrigin?: string,
) {
  const resolvedOrigin = resolveOrigin(currentOrigin);
  if (!resolvedOrigin) {
    return DEFAULT_POST_AUTH_PATH;
  }

  const nextTarget = redirectTo?.trim() || DEFAULT_POST_AUTH_PATH;

  try {
    const targetUrl = new URL(nextTarget, resolvedOrigin);
    if (targetUrl.origin !== resolvedOrigin) {
      return DEFAULT_POST_AUTH_PATH;
    }

    const nextPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
    return nextPath || DEFAULT_POST_AUTH_PATH;
  } catch {
    return DEFAULT_POST_AUTH_PATH;
  }
}

export function buildSupabaseAuthRedirectUrl(
  redirectTo?: string,
  currentOrigin?: string,
) {
  const resolvedOrigin = resolveOrigin(currentOrigin);
  if (!resolvedOrigin) {
    return undefined;
  }

  const callbackUrl = new URL(AUTH_CALLBACK_PATH, `${resolvedOrigin}/`);
  callbackUrl.searchParams.set(
    "next",
    getSafePostAuthRedirectPath(redirectTo, resolvedOrigin),
  );

  return callbackUrl.toString();
}
