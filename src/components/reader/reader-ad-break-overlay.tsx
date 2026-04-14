"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import {
  ReaderAdProvider,
  type ReaderAdProviderHandle,
} from "@/components/reader/reader-ad-provider";
import type {
  ReaderAdConsentRegion,
  ReaderAdConsentState,
  ReaderAdDemandMode,
  ReaderAdProviderId,
} from "@/lib/reader-ads";
import { getLocalizedCopy } from "@/lib/locale";

export type ReaderAdBreakPhase = "prompt" | "consent" | "loading" | "playing";

interface ReaderAdBreakOverlayProps {
  adTagUrl: string;
  consentRegion: ReaderAdConsentRegion;
  consentState: ReaderAdConsentState;
  demandMode: ReaderAdDemandMode;
  isOpen: boolean;
  locale: "en" | "es" | "pt";
  onAdCompleted: () => void;
  onAdFailed: (reason?: string) => void;
  onBeginAdBreak: () => void;
  onAdStarted: () => void;
  onConsentDenied: () => void;
  onConsentGranted: () => void;
  onUpgradeClick: () => void;
  phase: ReaderAdBreakPhase;
  provider: ReaderAdProviderId;
  upgradeHref: string;
}

export function ReaderAdBreakOverlay({
  adTagUrl,
  consentRegion,
  consentState,
  demandMode,
  isOpen,
  locale,
  onAdCompleted,
  onAdFailed,
  onBeginAdBreak,
  onAdStarted,
  onConsentDenied,
  onConsentGranted,
  onUpgradeClick,
  phase,
  provider,
  upgradeHref,
}: ReaderAdBreakOverlayProps) {
  const providerRef = useRef<ReaderAdProviderHandle>(null);
  const [isStartPending, setIsStartPending] = useState(false);

  if (!isOpen) {
    return null;
  }

  const copy = {
    kicker: getLocalizedCopy(locale, {
      en: "Free reading break",
      es: "Pausa gratuita de lectura",
      pt: "Pausa gratuita de leitura",
    }),
    title: getLocalizedCopy(locale, {
      en: "Watch a short sponsor to keep reading.",
      es: "Mira un patrocinio corto para seguir leyendo.",
      pt: "Assista a um patrocinio curto para continuar lendo.",
    }),
    body: getLocalizedCopy(locale, {
      en: "Leyendo stays the same underneath. This pop-up sits on top of your current session and unlocks the reader as soon as the sponsor break finishes.",
      es: "Leyendo sigue igual por debajo. Esta ventana se pone encima de tu sesion actual y desbloquea el lector apenas termine el patrocinio.",
      pt: "Leyendo continua igual por baixo. Esta janela fica sobre a sua sessao atual e desbloqueia o leitor assim que o patrocinio terminar.",
    }),
    start: getLocalizedCopy(locale, {
      en: "Continue reading",
      es: "Seguir leyendo",
      pt: "Continuar lendo",
    }),
    upgrade: getLocalizedCopy(locale, {
      en: "Go ad-free",
      es: "Seguir sin anuncios",
      pt: "Seguir sem anuncios",
    }),
    loading: getLocalizedCopy(locale, {
      en: "Loading the sponsor break...",
      es: "Cargando el patrocinio...",
      pt: "Carregando o patrocinio...",
    }),
    playing: getLocalizedCopy(locale, {
      en: "The sponsor is playing. The reader unlocks automatically as soon as it finishes.",
      es: "El patrocinio esta en reproduccion. El lector se desbloquea automaticamente al terminar.",
      pt: "O patrocinio esta sendo exibido. O leitor sera liberado automaticamente quando terminar.",
    }),
    consentTitle: getLocalizedCopy(locale, {
      en: "Allow ad storage to use sponsored reading breaks.",
      es: "Permite almacenamiento publicitario para usar pausas patrocinadas.",
      pt: "Permita armazenamento publicitario para usar pausas patrocinadas.",
    }),
    consentBody: getLocalizedCopy(locale, {
      en: `Live ad demand in your region (${consentRegion.toUpperCase()}) should wait for consent before serving. This plumbing is in place now so production rollout can stay compliant later.`,
      es: `La demanda publicitaria real en tu region (${consentRegion.toUpperCase()}) debe esperar consentimiento antes de mostrarse. Este paso ya queda preparado para un lanzamiento conforme despues.`,
      pt: `A demanda publicitaria real na sua regiao (${consentRegion.toUpperCase()}) deve esperar consentimento antes de exibir anuncios. Este fluxo ja fica preparado para um lancamento em conformidade depois.`,
    }),
    consentAllow: getLocalizedCopy(locale, {
      en: "Allow sponsored breaks",
      es: "Permitir pausas patrocinadas",
      pt: "Permitir pausas patrocinadas",
    }),
    consentSkip: getLocalizedCopy(locale, {
      en: "Not now",
      es: "Ahora no",
      pt: "Agora nao",
    }),
    testHint:
      demandMode === "test"
        ? getLocalizedCopy(locale, {
            en: "This uses test VAST demand only. Swap to live demand after Ad Manager approval.",
            es: "Esto usa solo demanda VAST de prueba. Cambialo a demanda real despues de la aprobacion de Ad Manager.",
            pt: "Isto usa apenas demanda VAST de teste. Troque para demanda real depois da aprovacao do Ad Manager.",
          })
        : undefined,
    consentGranted: getLocalizedCopy(locale, {
      en: "Consent granted for future live sponsored breaks.",
      es: "Consentimiento otorgado para futuras pausas patrocinadas reales.",
      pt: "Consentimento liberado para futuras pausas patrocinadas reais.",
    }),
  };

  const showConsentStep = phase === "consent";
  const showPlayer = phase === "loading" || phase === "playing";

  const handleStart = async (shouldBeginBreak = true) => {
    if (!providerRef.current) {
      onAdFailed("provider_unavailable");
      return;
    }

    setIsStartPending(true);
    try {
      if (shouldBeginBreak) {
        onBeginAdBreak();
      }
      await providerRef.current.start();
    } finally {
      setIsStartPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-140 flex items-center justify-center bg-[rgba(10,14,28,0.78)] px-4 py-6 backdrop-blur-md sm:px-6">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-3xl rounded-[2rem] border border-(--border-strong) bg-(--surface-card) p-5 shadow-[0_24px_120px_rgba(10,14,28,0.45)] sm:p-7"
      >
        <p className="text-xs tracking-[0.24em] text-(--accent-amber) uppercase">
          {copy.kicker}
        </p>
        <h2 className="font-heading mt-3 text-3xl leading-tight font-semibold text-(--text-strong) sm:text-4xl">
          {showConsentStep ? copy.consentTitle : copy.title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-(--text-muted) sm:text-base sm:leading-8">
          {showConsentStep ? copy.consentBody : copy.body}
        </p>

        {copy.testHint ? (
          <p className="mt-3 rounded-[1.15rem] border border-(--border-soft) bg-(--surface-soft) px-4 py-3 text-sm leading-7 text-(--text-muted)">
            {copy.testHint}
          </p>
        ) : null}

        {consentState === "granted" && demandMode === "live" ? (
          <p className="mt-3 text-sm leading-7 text-(--accent-sky)">
            {copy.consentGranted}
          </p>
        ) : null}

        <div
          className={
            showPlayer
              ? "space-y-3"
              : "pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 opacity-0"
          }
        >
          <ReaderAdProvider
            ref={providerRef}
            active={showPlayer || isStartPending}
            adTagUrl={adTagUrl}
            onCompleted={onAdCompleted}
            onFailed={onAdFailed}
            onStarted={onAdStarted}
            provider={provider}
          />
        </div>

        <div className="mt-6 space-y-4">
          {showPlayer ? (
            <div className="space-y-3">
              <p className="text-sm leading-7 text-(--text-muted)">
                {phase === "loading" ? copy.loading : copy.playing}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="grid gap-3 sm:max-w-xl">
                {showConsentStep ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onConsentGranted();
                        void handleStart(false);
                      }}
                      className="inline-flex min-h-12 items-center justify-center rounded-full border border-(--border-strong) bg-(--text-strong) px-5 py-3 text-sm font-medium text-(--text-on-accent) transition hover:opacity-90"
                    >
                      {copy.consentAllow}
                    </button>
                    <button
                      type="button"
                      onClick={onConsentDenied}
                      className="inline-flex min-h-12 items-center justify-center rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 py-3 text-sm font-medium text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
                    >
                      {copy.consentSkip}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      void handleStart();
                    }}
                    disabled={isStartPending}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-(--border-strong) bg-(--text-strong) px-5 py-3 text-sm font-medium text-(--text-on-accent) transition hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
                  >
                    {copy.start}
                  </button>
                )}
              </div>

              <Link
                href={upgradeHref}
                onClick={onUpgradeClick}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 py-3 text-sm font-medium text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
              >
                {copy.upgrade}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
