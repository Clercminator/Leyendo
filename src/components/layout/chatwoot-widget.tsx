"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    chatwootSettings?: {
      launcherTitle?: string;
      position?: "left" | "right";
      type?: "expanded_bubble" | "standard";
    };
    chatwootSDK?: {
      run: (options: { baseUrl: string; websiteToken: string }) => void;
    };
  }
}

let chatwootInjectPromise: Promise<void> | null = null;

export function getChatwootConfig() {
  const baseUrl = process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL?.trim();
  const websiteToken = process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN?.trim();

  if (!baseUrl || !websiteToken) {
    return null;
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    websiteToken,
  };
}

function injectChatwootScript(): Promise<void> {
  const config = getChatwootConfig();

  if (!config) {
    return Promise.resolve();
  }

  if (chatwootInjectPromise) {
    return chatwootInjectPromise;
  }

  if (typeof document === "undefined") {
    return Promise.resolve();
  }

  if (document.getElementById("chatwoot-sdk")) {
    return Promise.resolve();
  }

  chatwootInjectPromise = new Promise((resolve, reject) => {
    window.chatwootSettings = {
      position: "left",
      type: "standard",
      launcherTitle: "Chatea con nosotros",
    };

    const script = document.createElement("script");
    script.id = "chatwoot-sdk";
    script.src = `${config.baseUrl}/packs/js/sdk.js`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      try {
        window.chatwootSDK?.run({
          websiteToken: config.websiteToken,
          baseUrl: config.baseUrl,
        });
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    script.onerror = () => {
      chatwootInjectPromise = null;
      reject(new Error("Chatwoot SDK failed to load"));
    };

    document.body.appendChild(script);
  });

  return chatwootInjectPromise;
}

export function ChatwootWidget() {
  useEffect(() => {
    void injectChatwootScript();
  }, []);

  return null;
}