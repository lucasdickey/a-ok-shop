import type { Metadata } from "next";
import Link from "next/link";
import ImageGrid from "@/app/components/ImageGrid";
import ChaosMonkeyCard from "@/app/components/ChaosMonkeyCard";
import PrintRequestButton from "@/app/components/PrintRequestButton";
import { formatDropDate, getChaosMonkeys, type ChaosMonkey } from "@/app/lib/chaos-monkeys";
import { getGalleryImages } from "@/app/lib/gallery-images";

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

export default async function ChaosMonkeysPage() {
  const monkeys = getChaosMonkeys();
  const drops = groupByDate(monkeys);
  const galleryImages = await getGalleryImages();

  return (
    <div className="px-5 py-10 sm:px-8 lg:px-[4vw] lg:py-16">
      <header className="mb-12 max-w-3xl">
        <p className="micro">
          {monkeys.length > 0 ? `${monkeys.length} published · Nº 0001–${monkeys[0].id}` : "Series starting soon"}
        </p>
        <h1 className="display-heading mt-4 text-[clamp(64px,9vw,126px)]">
          Chaos
          <br />
          <span className="text-primary">monkeys<span className="period-pulse">.</span></span>
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
              <div key={monkey.id}>
                <ChaosMonkeyCard monkey={monkey} detailed priority={dropIndex === 0} />
                <PrintRequestButton id={monkey.id} title={monkey.title} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Moved here from the homepage: every monkey and the older art, shuffling. */}
      <section aria-label="The whole archive" className="border-2 border-dark bg-club-paper p-3 text-dark shadow-hard-lg sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="micro">Fig. 04 / The whole archive, shuffling</p>
          <Link href="/gallery" className="micro inline-flex min-h-[44px] items-center">
            Enter the art archive ↗
          </Link>
        </div>
        {galleryImages.length > 0 ? (
          <ImageGrid images={galleryImages} title="CHAOS MONKEYS AT WORK" />
        ) : (
          <p className="micro border-2 border-dashed border-dark p-8 text-center">
            Image gallery is currently loading or unavailable.
          </p>
        )}
      </section>
    </div>
  );
}
