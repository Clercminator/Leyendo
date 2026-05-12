"use client";

import { useEffect } from "react";

const SERVICE_WORKER_PATH = "/service-worker.js";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    void navigator.serviceWorker
      .register(SERVICE_WORKER_PATH, {
        scope: "/",
      })
      .then((registration) => {
        void registration.update();
      })
      .catch((error) => {
        console.warn("service worker registration failed", error);
      });
  }, []);

  return null;
}