import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarX, ShieldCheck, Wallet, AlertTriangle } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/cancellation-policy")({
  head: () => ({
    meta: [
      { title: "Cancellation Policy — Dreambuilders Venue Hire" },
      {
        name: "description",
        content:
          "Cancellation terms for venue hire at Dreambuilders Church: deposit forfeiture by notice period, bond refunds, and payment deadlines.",
      },
      { property: "og:title", content: "Cancellation Policy — Dreambuilders Venue Hire" },
      {
        property: "og:description",
        content:
          "Cancellation terms for venue hire: deposit forfeiture by notice period, bond refunds, and payment deadlines.",
      },
      { property: "og:url", content: "https://hiredreambuilders.lovable.app/cancellation-policy" },
      { property: "og:type", content: "article" },
    ],
    links: [
      { rel: "canonical", href: "https://hiredreambuilders.lovable.app/cancellation-policy" },
    ],
  }),
  component: CancellationPolicyPage,
});

const forfeits = [
  {
    window: "More than 30 days before your event",
    outcome: "You forfeit 50% of the deposit",
  },
  {
    window: "Within 30 days of your event",
    outcome: "You forfeit the full deposit",
  },
  {
    window: "Within 7 days of your event",
    outcome: "You forfeit all fees paid",
  },
];

function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Venue hire terms
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Cancellation Policy
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          We know plans change. This policy explains what happens to your deposit, bond and fees
          if you need to cancel a confirmed hire at Dreambuilders Church.
        </p>

        <section className="mt-12">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarX className="h-5 w-5" />
            </span>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              If you cancel
            </h2>
          </div>
          <p className="mt-3 text-muted-foreground">
            The amount you forfeit depends on how much notice you give before your event date:
          </p>
          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 font-semibold text-foreground">Notice given</th>
                  <th className="px-4 py-3 font-semibold text-foreground">What you forfeit</th>
                </tr>
              </thead>
              <tbody>
                {forfeits.map((row) => (
                  <tr key={row.window} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-foreground">{row.window}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </span>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Confirming your dates
            </h2>
          </div>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              Your dates are confirmed once both the <strong className="text-foreground">20% deposit</strong> and
              the <strong className="text-foreground">refundable $2,000 bond</strong> have been paid.
            </li>
            <li>
              The remaining balance and bond are due no later than <strong className="text-foreground">14 days before your event</strong>.
            </li>
          </ul>
        </section>

        <section className="mt-12">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Bond refunds
            </h2>
          </div>
          <p className="mt-4 text-muted-foreground">
            The $2,000 bond is refunded within 14 days after your event, less any deductions for
            damage to the venue or breach of the hire terms.
          </p>
        </section>

        <section className="mt-12">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Breach of terms
            </h2>
          </div>
          <p className="mt-4 text-muted-foreground">
            If the hire terms are breached, we may end the event immediately. In that case no
            refund of fees paid is given.
          </p>
        </section>

        <div className="mt-14 rounded-xl border border-border bg-muted/40 p-6 text-center">
          <p className="text-muted-foreground">
            Ready to plan your event? Get an instant estimate with no commitment.
          </p>
          <Link
            to="/quote"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get an estimate
          </Link>
        </div>
      </main>
    </div>
  );
}
