"use client";

import { useEffect } from "react";

const DEFAULT_CHATWOOT_BASE_URL = "https://chatwoot.dsdtech.ai";
const DEFAULT_CHATWOOT_WEBSITE_TOKEN = "8Sk2Rx96uVL1amCMwLmWTYte";
const CHATWOOT_BASE_URL =
  process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL?.trim() ||
  DEFAULT_CHATWOOT_BASE_URL;
const CHATWOOT_WEBSITE_TOKEN =
  process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN?.trim() ||
  DEFAULT_CHATWOOT_WEBSITE_TOKEN;

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

function injectChatwootScript(): Promise<void> {
  if (chatwootInjectPromise) {
    return chatwootInjectPromise;
  }

  if (!CHATWOOT_BASE_URL || !CHATWOOT_WEBSITE_TOKEN) {
    chatwootInjectPromise = Promise.resolve();
    return chatwootInjectPromise;
  }

  if (typeof document === "undefined") {
    chatwootInjectPromise = Promise.resolve();
    return chatwootInjectPromise;
  }

  if (document.getElementById("chatwoot-sdk")) {
    chatwootInjectPromise = Promise.resolve();
    return chatwootInjectPromise;
  }

  chatwootInjectPromise = new Promise((resolve, reject) => {
    const baseUrl = CHATWOOT_BASE_URL.replace(/\/$/, "");

    window.chatwootSettings = {
      position: "left",
      type: "standard",
      launcherTitle: "Chatea con nosotros",
    };

    const script = document.createElement("script");
    script.id = "chatwoot-sdk";
    script.src = `${baseUrl}/packs/js/sdk.js`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      try {
        window.chatwootSDK?.run({
          websiteToken: CHATWOOT_WEBSITE_TOKEN,
          baseUrl,
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