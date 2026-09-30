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
    const group = groups.get(monkey.date);
    if (group) group.push(monkey);
    else groups.set(monkey.date, [monkey]);
  }
  return Array.from(groups.entries());
}

export default function ChaosMonkeysPage() {
  const monkeys = getChaosMonkeys();
  const drops = groupByDate(monkeys);
  const ids = monkeys.map((monkey) => monkey.id).sort();

  return (
    <div className="container mx-auto px-8 py-12 md:px-16 lg:px-24 xl:px-32">
      <header className="mb-12 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8B1E24]">
          {ids.length === 0
            ? "Series starting soon"
            : `${ids.length} published · Nº ${ids.length === 1 ? ids[0] : `${ids[0]}–${ids[ids.length - 1]}`}`}
        </p>
        <h1 className="mt-2 font-bebas-neue text-6xl leading-none md:text-7xl">Chaos Monkeys</h1>
        <p className="mt-4 text-lg leading-relaxed text-dark-light">{DESCRIPTION}</p>
      </header>

      {drops.length === 0 && (
        <p className="rounded-lg border-2 border-dashed border-[#1F1F1F] p-8 text-center text-dark-light">
          The first monkeys are still at their keyboards.
        </p>
      )}

      {drops.map(([date, items], dropIndex) => (
        <section key={date} aria-labelledby={`drop-${date}`} className="mb-16">
          <h2
            id={`drop-${date}`}
            className="mb-6 border-b-2 border-[#1F1F1F] pb-2 font-bebas-neue text-3xl tracking-wide md:text-4xl"
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
