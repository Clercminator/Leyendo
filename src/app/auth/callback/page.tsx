"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { useSupabaseAuth } from "@/components/auth/supabase-provider";
import { getSafePostAuthRedirectPath } from "@/lib/supabase/auth-redirect";

function AuthCallbackCard({
  authError,
  nextPath,
}: {
  authError?: string;
  nextPath: string;
}) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center px-4 py-16 sm:px-6">
      <section className="w-full rounded-[1.75rem] border border-(--border-soft) bg-(--surface-strong) p-6 shadow-[0_22px_80px_rgba(8,12,22,0.2)] sm:p-8">
        <p className="text-[0.72rem] tracking-[0.24em] text-(--accent-amber) uppercase">
          Leyendo
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-(--text-strong)">
          {authError
            ? "Authentication could not finish"
            : "Connecting your account"}
        </h1>
        <p className="mt-4 text-sm leading-7 text-(--text-muted)">
          {authError
            ? authError
            : "Hold on while Leyendo confirms the session and sends you back to the page you started from."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={nextPath}
            className="inline-flex min-h-11 items-center rounded-full border border-(--border-soft) bg-(--surface-soft) px-5 py-2.5 text-sm font-medium text-(--text-strong) transition hover:border-(--border-strong) hover:bg-(--surface-chip)"
          >
            Continue
          </Link>
        </div>
      </section>
    </main>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { errorMessage, isConfigured, isLoading, user } = useSupabaseAuth();

  const nextPath = getSafePostAuthRedirectPath(searchParams.get("next"));
  const authError =
    searchParams.get("error_description") ??
    searchParams.get("error") ??
    errorMessage;

  useEffect(() => {
    if (!isConfigured || isLoading) {
      return;
    }

    if (user) {
      router.replace(nextPath);
      return;
    }

    if (authError) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      router.replace(nextPath);
    }, 1500);

    return () => {
      window.clearTimeout(redirectTimer);
    };
  }, [authError, isConfigured, isLoading, nextPath, router, user]);

  return (
    <AuthCallbackCard authError={authError ?? undefined} nextPath={nextPath} />
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackCard nextPath="/account" />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
