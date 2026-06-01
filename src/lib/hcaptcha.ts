type HCaptchaWidgetId = number | string;

interface HCaptchaExecuteResult {
  key: string;
  response: string;
}

interface HCaptchaApi {
  execute: (
    widgetId?: HCaptchaWidgetId,
    options?: { async?: boolean },
  ) => Promise<HCaptchaExecuteResult | string> | string;
  remove?: (widgetId?: HCaptchaWidgetId) => void;
  render: (
    container: HTMLElement | string,
    params: Record<string, unknown>,
  ) => HCaptchaWidgetId;
  reset: (widgetId?: HCaptchaWidgetId) => void;
}

interface HCaptchaWindow extends Window {
  __LEYENDO_HCAPTCHA_ONLOAD__?: () => void;
  hcaptcha?: HCaptchaApi;
}

interface CreateHCaptchaControllerOptions {
  container: () => HTMLElement | null;
  siteKey: string;
}

export interface HCaptchaController {
  destroy: () => void;
  execute: () => Promise<string>;
}

const HCAPTCHA_SCRIPT_ID = "leyendo-hcaptcha-script";
const HCAPTCHA_ONLOAD_CALLBACK = "__LEYENDO_HCAPTCHA_ONLOAD__";
const FALLBACK_HCAPTCHA_SITE_KEY = "028c8226-1642-4a1c-b6d6-ce8c9cdac728";

function getCaptchaWindow(): HCaptchaWindow {
  if (typeof window === "undefined") {
    throw new Error("Captcha is only available in the browser.");
  }

  return window as HCaptchaWindow;
}

function getHCaptchaErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  switch (error) {
    case "challenge-closed":
      return "Captcha challenge was closed. Please try again.";
    case "challenge-expired":
      return "Captcha challenge expired. Please try again.";
    case "missing-captcha":
      return "Captcha could not start. Refresh the page and try again.";
    case "network-error":
      return "Captcha could not reach hCaptcha. Check your connection and try again.";
    case "rate-limited":
      return "Too many captcha attempts. Wait a moment and try again.";
    case "script-error":
      return "Captcha could not load. Check whether hCaptcha is blocked in this browser.";
    case "invalid-captcha-id":
      return "Captcha session expired. Refresh the page and try again.";
    default:
      return "Captcha verification failed. Please try again.";
  }
}

export function getHCaptchaSiteKey(): string {
  const configuredSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim();

  if (configuredSiteKey) {
    return configuredSiteKey;
  }

  return process.env.NODE_ENV === "production"
    ? FALLBACK_HCAPTCHA_SITE_KEY
    : "";
}

export function createHCaptchaController({
  container,
  siteKey,
}: CreateHCaptchaControllerOptions): HCaptchaController {
  let scriptPromise: Promise<HCaptchaApi> | null = null;
  let widgetId: HCaptchaWidgetId | null = null;
  let widgetPromise: Promise<HCaptchaWidgetId> | null = null;

  const ensureScript = async (): Promise<HCaptchaApi> => {
    const activeWindow = getCaptchaWindow();

    if (activeWindow.hcaptcha) {
      return activeWindow.hcaptcha;
    }

    if (!scriptPromise) {
      scriptPromise = new Promise<HCaptchaApi>((resolve, reject) => {
        let settled = false;
        const existingScript = document.getElementById(
          HCAPTCHA_SCRIPT_ID,
        ) as HTMLScriptElement | null;

        const complete = (callback: () => void) => {
          if (settled) {
            return;
          }

          settled = true;
          callback();
        };

        const cleanup = (script: HTMLScriptElement | null) => {
          delete activeWindow[HCAPTCHA_ONLOAD_CALLBACK];
          if (!script) {
            return;
          }

          script.removeEventListener("error", handleError);
          script.removeEventListener("load", handleReady);
        };

        const handleReady = () => {
          complete(() => {
            cleanup(targetScript);

            if (activeWindow.hcaptcha) {
              resolve(activeWindow.hcaptcha);
              return;
            }

            scriptPromise = null;
            reject(
              new Error("Captcha loaded without exposing the hCaptcha client."),
            );
          });
        };

        const handleError = () => {
          complete(() => {
            cleanup(targetScript);
            scriptPromise = null;
            reject(
              new Error(
                "Captcha could not load. Check whether js.hcaptcha.com is blocked in this browser.",
              ),
            );
          });
        };

        activeWindow[HCAPTCHA_ONLOAD_CALLBACK] = handleReady;

        const targetScript = existingScript ?? document.createElement("script");
        targetScript.addEventListener("error", handleError);
        targetScript.addEventListener("load", handleReady);

        if (existingScript) {
          return;
        }

        targetScript.id = HCAPTCHA_SCRIPT_ID;
        targetScript.async = true;
        targetScript.defer = true;
        targetScript.src =
          "https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off&onload=" +
          HCAPTCHA_ONLOAD_CALLBACK;

        document.head.appendChild(targetScript);
      });
    }

    return scriptPromise;
  };

  const ensureWidget = async (): Promise<HCaptchaWidgetId> => {
    if (!widgetPromise) {
      widgetPromise = ensureScript()
        .then((hcaptcha) => {
          const captchaContainer = container();

          if (!captchaContainer) {
            throw new Error("Captcha could not initialize. Refresh the page and try again.");
          }

          widgetId = hcaptcha.render(captchaContainer, {
            sitekey: siteKey,
            size: "invisible",
          });

          return widgetId;
        })
        .catch((error) => {
          widgetPromise = null;
          throw error;
        });
    }

    return widgetPromise;
  };

  return {
    destroy() {
      const activeWindow =
        typeof window === "undefined" ? undefined : (window as HCaptchaWindow);

      if (widgetId !== null && activeWindow?.hcaptcha?.remove) {
        activeWindow.hcaptcha.remove(widgetId);
      }

      widgetId = null;
      widgetPromise = null;
    },
    async execute() {
      const hcaptcha = await ensureScript();
      const activeWidgetId = await ensureWidget();

      try {
        const result = await hcaptcha.execute(activeWidgetId, { async: true });
        const response =
          typeof result === "string" ? result : result?.response ?? undefined;

        if (!response) {
          throw new Error("Captcha verification did not return a token.");
        }

        return response;
      } catch (error) {
        throw new Error(getHCaptchaErrorMessage(error));
      } finally {
        hcaptcha.reset(activeWidgetId);
      }
    },
  };
}