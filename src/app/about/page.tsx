import { AppShell } from "@/components/layout/app-shell";

export default function AboutPage() {
  return (
    <AppShell
      eyebrow="About Leyendo"
      title="Faster document reading without fake promises."
      description="Leyendo is designed as a calm reading studio for people who want better pacing, clearer focus, and easier recovery when speed starts to hurt comprehension."
    >
      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Local-first</h2>
          <p className="mt-3 text-sm leading-7 text-(--text-muted)">
            Uploaded files still open locally first. Accounts stay optional and
            only exist for people who want cloud backup and cross-device sync.
          </p>
        </article>
        <article className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">
            Beginner-friendly
          </h2>
          <p className="mt-3 text-sm leading-7 text-(--text-muted)">
            The product is built around visible control: stop, slow down,
            repeat, restart, or drop back to Classic Reader at any time.
          </p>
        </article>
        <article className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Future-ready</h2>
          <p className="mt-3 text-sm leading-7 text-(--text-muted)">
            The architecture leaves room for more modes, optional sync, and
            deeper assistance later without bloating the MVP today.
          </p>
        </article>
      </section>
    </AppShell>
  );
}
