"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import { LoaderCircle, MessageCircleMore, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSupabaseAuth } from "@/components/auth/supabase-provider";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { submitFeedback } from "@/lib/supabase/library-sync";

export function FeedbackButton() {
  const pathname = usePathname();
  const { user } = useSupabaseAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState<number>();
  const [statusMessage, setStatusMessage] = useState<string>();

  async function handleSubmit() {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !isSupabaseConfigured) {
      setStatusMessage("Supabase is not configured yet.");
      return;
    }

    if (!message.trim()) {
      setStatusMessage("Write a short message first.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(undefined);

    try {
      await submitFeedback(supabase, {
        email: user?.email ? undefined : email,
        message,
        rating,
        route: pathname,
        userId: user?.id,
      });
      setMessage("");
      setEmail("");
      setRating(undefined);
      setStatusMessage("Thanks. Your feedback was sent.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Feedback could not be sent.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-90 flex max-w-sm flex-col items-end gap-3">
      {isOpen ? (
        <section className="pointer-events-auto w-[min(24rem,calc(100vw-2.5rem))] rounded-[1.75rem] border border-(--border-soft) bg-(--surface-strong) p-5 shadow-[0_24px_70px_rgba(8,12,22,0.24)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="editorial-kicker text-(--accent-amber)">Feedback</p>
              <h2 className="mt-2 text-xl font-semibold text-(--text-strong)">
                Tell me what slows you down.
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close feedback panel"
              className="rounded-full border border-(--border-soft) bg-(--surface-soft) p-2 text-(--text-muted) transition hover:border-(--border-strong) hover:bg-(--surface-chip) hover:text-(--text-strong)"
              onClick={() => {
                setIsOpen(false);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <textarea
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
            }}
            placeholder="A bug, a rough reader moment, a missing feature, or an import problem..."
            className="mt-4 min-h-32 w-full rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) px-4 py-3 text-sm leading-7 text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
          />

          {!user?.email ? (
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              placeholder="Optional email if you want a reply"
              className="mt-3 h-11 w-full rounded-[1.25rem] border border-(--border-soft) bg-(--surface-input) px-4 text-sm text-(--text-strong) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
            />
          ) : null}

          <div className="mt-4 flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setRating((currentValue) =>
                    currentValue === value ? undefined : value,
                  );
                }}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  rating === value
                    ? "border-(--border-strong) bg-(--surface-chip) text-(--text-strong)"
                    : "border-(--border-soft) bg-(--surface-soft) text-(--text-muted) hover:border-(--border-strong) hover:bg-(--surface-chip) hover:text-(--text-strong)"
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          {statusMessage ? (
            <p className="mt-4 text-sm leading-7 text-(--text-muted)">
              {statusMessage}
            </p>
          ) : null}

          <div className="mt-5 flex justify-end">
            <Button
              className="h-11 rounded-full px-5"
              disabled={isSubmitting}
              onClick={() => {
                void handleSubmit();
              }}
            >
              {isSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send feedback
            </Button>
          </div>
        </section>
      ) : null}

      <Button
        className="pointer-events-auto h-12 rounded-full px-5 shadow-[0_18px_45px_rgba(8,12,22,0.22)]"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        <MessageCircleMore className="h-4 w-4" />
        Feedback
      </Button>
    </div>
  );
}
