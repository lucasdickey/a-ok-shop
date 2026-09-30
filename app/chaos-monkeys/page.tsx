import type { Metadata } from "next";
import ChaosMonkeyCard from "@/app/components/ChaosMonkeyCard";
import { formatDropDate, getChaosMonkeys, type ChaosMonkey } from "@/app/lib/chaos-monkeys";

const DESCRIPTION =
  "New apes most days. Written and art-directed by Claude, illustrated by GPT-6-Astra, and picked by a person before they ship.";

const latest = getChaosMonkeys()[0];

export const metadata: Metadata = {
  title: "Chaos Monkeys · A-OK",
  description: DESCRIPTION,
  openGraph: {
    title: "Chaos Monkeys · A-OK",
    description: DESCRIPTION,
    images: latest ? [{ url: latest.image, width: latest.width, height: latest.height, alt: latest.alt }] : [],
  },
};

/** Groups monkeys by drop date, keeping the newest date first. */
function groupByDate(monkeys: ChaosMonkey[]): Array<[string, ChaosMonkey[]]> {
  const groups = new Map<string, ChaosMonkey[]>();
  for (const monkey of monkeys) {
    groups.set(monkey.date, [...(groups.get(monkey.date) ?? []), monkey]);
  }
  return Array.from(groups.entries());
}

export default function ChaosMonkeysPage() {
  const monkeys = getChaosMonkeys();
  const drops = groupByDate(monkeys);

  return (
    <div className="px-5 py-10 sm:px-8 lg:px-[4vw] lg:py-16">
      <header className="mb-12 max-w-3xl">
        <p className="micro">
          {monkeys.length > 0 ? `${monkeys.length} published · Nº 0001–${monkeys[0].id}` : "Series starting soon"}
        </p>
        <h1 className="display-heading mt-4 text-[clamp(64px,9vw,126px)]">
          Chaos
          <br />
          <span className="text-primary">monkeys.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed">{DESCRIPTION}</p>
      </header>

      {drops.length === 0 && (
        <p className="border-2 border-dashed border-dark p-8 text-center">
          The first monkeys are still at their keyboards.
        </p>
      )}

      {drops.map(([date, items], dropIndex) => (
        <section key={date} aria-labelledby={`drop-${date}`} className="mb-16">
          <h2
            id={`drop-${date}`}
            className="display-heading mb-8 border-y-2 border-dashed border-dark py-3 text-4xl md:text-5xl"
          >
            {formatDropDate(date)}
          </h2>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((monkey) => (
              <ChaosMonkeyCard key={monkey.id} monkey={monkey} detailed priority={dropIndex === 0} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
