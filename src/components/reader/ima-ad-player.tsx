"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

interface GoogleImaNamespace {
  AdDisplayContainer: new (
    containerElement: HTMLElement,
    videoElement: HTMLVideoElement,
  ) => {
    destroy?: () => void;
    initialize: () => void;
  };
  AdErrorEvent: {
    Type: {
      AD_ERROR: string;
    };
  };
  AdEvent: {
    Type: {
      ALL_ADS_COMPLETED: string;
      COMPLETE: string;
      CONTENT_PAUSE_REQUESTED: string;
      CONTENT_RESUME_REQUESTED: string;
      LOADED: string;
      STARTED: string;
    };
  };
  AdsLoader: new (adDisplayContainer: { initialize: () => void }) => {
    addEventListener: (
      type: string,
      listener: (event: unknown) => void,
      useCapture?: boolean,
    ) => void;
    contentComplete?: () => void;
    destroy?: () => void;
    removeEventListener?: (
      type: string,
      listener: (event: unknown) => void,
      useCapture?: boolean,
    ) => void;
    requestAds: (adsRequest: unknown) => void;
  };
  AdsManagerLoadedEvent: {
    Type: {
      ADS_MANAGER_LOADED: string;
    };
  };
  AdsRenderingSettings: new () => {
    restoreCustomPlaybackStateOnAdBreakComplete?: boolean;
  };
  AdsRequest: new () => {
    adTagUrl: string;
    linearAdSlotHeight?: number;
    linearAdSlotWidth?: number;
    nonLinearAdSlotHeight?: number;
    nonLinearAdSlotWidth?: number;
  };
  ViewMode: {
    NORMAL: string;
  };
}

interface GoogleImaAdsManager {
  addEventListener: (type: string, listener: (event: unknown) => void) => void;
  destroy: () => void;
  init: (width: number, height: number, viewMode?: string) => void;
  resize: (width: number, height: number, viewMode?: string) => void;
  start: () => void;
}

interface GoogleImaErrorEvent {
  getError?: () => {
    getMessage?: () => string;
    toString?: () => string;
  };
}

interface GoogleImaLoadedEvent {
  getAdsManager: (
    videoElement: HTMLVideoElement,
    settings: unknown,
  ) => GoogleImaAdsManager;
}

declare global {
  interface Window {
    google?: {
      ima?: GoogleImaNamespace;
    };
  }
}

let imaSdkPromise: Promise<GoogleImaNamespace> | undefined;

function getImaNamespace() {
  return window.google?.ima;
}

export function preloadImaSdk() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IMA can only load in the browser."));
  }

  const existingNamespace = getImaNamespace();
  if (existingNamespace) {
    return Promise.resolve(existingNamespace);
  }

  if (imaSdkPromise) {
    return imaSdkPromise;
  }

  imaSdkPromise = new Promise<GoogleImaNamespace>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-leyendo-ima="true"]',
    );

    const handleResolve = () => {
      const namespace = getImaNamespace();
      if (namespace) {
        resolve(namespace);
        return;
      }

      reject(new Error("IMA SDK loaded without a google.ima namespace."));
    };

    if (existingScript) {
      existingScript.addEventListener("load", handleResolve, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load the IMA SDK.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.dataset.leyendoIma = "true";
    script.src = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";
    script.addEventListener("load", handleResolve, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Unable to load the IMA SDK.")),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return imaSdkPromise;
}

export interface ReaderAdProviderHandle {
  start: () => Promise<void>;
}

interface ImaAdPlayerProps {
  active: boolean;
  adTagUrl: string;
  onCompleted: () => void;
  onFailed: (reason?: string) => void;
  onStarted: () => void;
}

export const ImaAdPlayer = forwardRef<ReaderAdProviderHandle, ImaAdPlayerProps>(
  function ImaAdPlayer(
    { active, adTagUrl, onCompleted, onFailed, onStarted },
    ref,
  ) {
    const adContainerRef = useRef<HTMLDivElement>(null);
    const contentVideoRef = useRef<HTMLVideoElement>(null);
    const adsManagerRef = useRef<GoogleImaAdsManager | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const completionHandledRef = useRef(false);
    const startedRef = useRef(false);

    const teardown = () => {
      completionHandledRef.current = false;
      startedRef.current = false;
      setIsLoading(false);
      adsManagerRef.current?.destroy();
      adsManagerRef.current = null;
    };

    useEffect(() => {
      void preloadImaSdk().catch(() => {
        // Preload stays best-effort. Start() handles real errors.
      });

      return () => {
        teardown();
      };
    }, []);

    useEffect(() => {
      if (!active || !adsManagerRef.current) {
        return;
      }

      const handleResize = () => {
        const container = adContainerRef.current;
        if (!container || !adsManagerRef.current) {
          return;
        }

        adsManagerRef.current.resize(
          Math.max(container.clientWidth, 1),
          Math.max(container.clientHeight, 1),
          getImaNamespace()?.ViewMode.NORMAL,
        );
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }, [active]);

    useImperativeHandle(ref, () => ({
      start: async () => {
        const adContainer = adContainerRef.current;
        const contentVideo = contentVideoRef.current;

        if (!adContainer || !contentVideo) {
          onFailed("ad_container_unavailable");
          return;
        }

        setIsLoading(true);

        try {
          const ima = await preloadImaSdk();
          const displayContainer = new ima.AdDisplayContainer(
            adContainer,
            contentVideo,
          );

          displayContainer.initialize();

          const adsLoader = new ima.AdsLoader(displayContainer);

          const handleFailure = (event: unknown) => {
            const errorEvent = event as GoogleImaErrorEvent;
            const reason =
              errorEvent.getError?.().getMessage?.() ??
              errorEvent.getError?.().toString?.() ??
              "ima_ad_error";
            teardown();
            onFailed(reason);
          };

          adsLoader.addEventListener(
            ima.AdErrorEvent.Type.AD_ERROR,
            handleFailure,
            false,
          );

          adsLoader.addEventListener(
            ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
            (loadedEvent: unknown) => {
              const managerLoadedEvent = loadedEvent as GoogleImaLoadedEvent;
              const adsRenderingSettings = new ima.AdsRenderingSettings();
              adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;

              const adsManager = managerLoadedEvent.getAdsManager(
                contentVideo,
                adsRenderingSettings,
              );
              adsManagerRef.current = adsManager;

              const handleComplete = () => {
                if (completionHandledRef.current) {
                  return;
                }

                completionHandledRef.current = true;
                teardown();
                onCompleted();
              };

              adsManager.addEventListener(
                ima.AdErrorEvent.Type.AD_ERROR,
                handleFailure,
              );
              adsManager.addEventListener(
                ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,
                () => {
                  if (startedRef.current) {
                    return;
                  }

                  startedRef.current = true;
                  setIsLoading(false);
                  onStarted();
                },
              );
              adsManager.addEventListener(ima.AdEvent.Type.STARTED, () => {
                if (startedRef.current) {
                  return;
                }

                startedRef.current = true;
                setIsLoading(false);
                onStarted();
              });
              adsManager.addEventListener(
                ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
                handleComplete,
              );
              adsManager.addEventListener(
                ima.AdEvent.Type.ALL_ADS_COMPLETED,
                handleComplete,
              );
              adsManager.addEventListener(
                ima.AdEvent.Type.COMPLETE,
                handleComplete,
              );

              try {
                adsManager.init(
                  Math.max(adContainer.clientWidth, 1),
                  Math.max(adContainer.clientHeight, 1),
                  ima.ViewMode.NORMAL,
                );
                adsManager.start();
              } catch (error) {
                teardown();
                onFailed(
                  error instanceof Error ? error.message : "ima_start_failed",
                );
              }
            },
            false,
          );

          const request = new ima.AdsRequest();
          request.adTagUrl = adTagUrl;
          request.linearAdSlotWidth = Math.max(adContainer.clientWidth, 1);
          request.linearAdSlotHeight = Math.max(adContainer.clientHeight, 1);
          request.nonLinearAdSlotWidth = Math.max(adContainer.clientWidth, 1);
          request.nonLinearAdSlotHeight = Math.max(
            Math.floor(adContainer.clientHeight / 3),
            1,
          );
          adsLoader.requestAds(request);
        } catch (error) {
          teardown();
          onFailed(
            error instanceof Error ? error.message : "ima_sdk_unavailable",
          );
        }
      },
    }));

    return (
      <div
        className={`relative h-full min-h-56 w-full overflow-hidden rounded-[1.5rem] border border-(--border-soft) bg-black ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <video
          ref={contentVideoRef}
          className="absolute inset-0 h-full w-full opacity-0"
          muted
          playsInline
          preload="none"
        />
        <div ref={adContainerRef} className="absolute inset-0" />
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75 px-4 text-center text-sm text-white/80">
            Loading sponsor break...
          </div>
        ) : null}
      </div>
    );
  },
);
