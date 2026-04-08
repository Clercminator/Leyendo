import { notFound } from "next/navigation";

import { LocaleProvider } from "@/components/layout/locale-provider";
import { isTranslatedPublicLocale, translatedPublicLocales } from "@/lib/public-paths";

export const dynamicParams = false;

export function generateStaticParams() {
  return translatedPublicLocales.map((locale) => ({ locale }));
}

export default async function LocalizedPublicLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!isTranslatedPublicLocale(locale)) {
    notFound();
  }

  return <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>;
}
