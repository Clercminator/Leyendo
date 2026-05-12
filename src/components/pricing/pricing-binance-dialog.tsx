import Image from "next/image";
import Link from "next/link";

import { X } from "lucide-react";

import { getLocalizedPublicPath } from "@/lib/public-paths";
import { founderGitHubUrl, founderLinkedInUrl } from "@/lib/site";
import type { AppLocale } from "@/lib/locale";

const binanceQrPath = "/payment/BinanceQR.png";

interface PricingBinanceDialogProps {
  binanceDialogHint: string;
  binanceDialogTitle: string;
  closeLabel: string;
  contactDavidLabel: string;
  contactButtonClass: string;
  locale: AppLocale;
  planLabel: string;
  price: number;
  onClose: () => void;
}

export function PricingBinanceDialog({
  binanceDialogHint,
  binanceDialogTitle,
  closeLabel,
  contactDavidLabel,
  contactButtonClass,
  locale,
  planLabel,
  price,
  onClose,
}: PricingBinanceDialogProps) {
  return (
    <div
      className="fixed inset-0 z-120 flex items-center justify-center bg-[rgba(9,14,24,0.72)] px-4 py-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={binanceDialogTitle}
        className="w-full max-w-md rounded-[2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(11,17,31,0.98),rgba(14,21,36,0.95))] p-6 text-white shadow-[0_30px_110px_rgba(0,0,0,0.45)]"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="editorial-kicker text-[#ffcf88]">Binance Pay</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
              {binanceDialogTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/12 bg-white/6 text-white transition hover:bg-white/12"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{closeLabel}</span>
          </button>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
          <p className="text-sm text-white/70">
            {locale === "en" ? "Plan" : locale === "es" ? "Plan" : "Plano"}
          </p>
          <p className="mt-1 text-lg font-semibold">{planLabel}</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            ${price.toFixed(2)}
          </p>
        </div>

        <div className="mt-5 flex justify-center rounded-[1.5rem] bg-white p-3">
          <Image
            src={binanceQrPath}
            alt="Binance Pay QR code"
            width={300}
            height={300}
            className="h-auto w-full max-w-70 rounded-[1rem]"
          />
        </div>

        <ol className="mt-5 space-y-3 text-sm leading-7 text-white/80">
          <li className="flex gap-3">
            <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
              1
            </span>
            <span>
              {locale === "en"
                ? "Scan the QR code from Binance Pay and send the exact USD equivalent."
                : locale === "es"
                  ? "Escanea el QR desde Binance Pay y envia el equivalente exacto en USD."
                  : "Escaneie o QR no Binance Pay e envie o equivalente exato em USD."}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
              2
            </span>
            <span>{binanceDialogHint}</span>
          </li>
        </ol>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href={getLocalizedPublicPath("/about", locale)}
            className={contactButtonClass}
            onClick={onClose}
          >
            {contactDavidLabel}
          </Link>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            <a
              href={founderLinkedInUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#d8a11c]/55 px-4 py-3 text-sm font-medium text-[#f4b722] transition-colors hover:bg-[#f4b722]/10"
            >
              LinkedIn
            </a>
            <a
              href={founderGitHubUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#d8a11c]/55 px-4 py-3 text-sm font-medium text-[#f4b722] transition-colors hover:bg-[#f4b722]/10"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}