import Image from "next/image";
import Link from "next/link";
import { formatDropDate, type ChaosMonkey } from "@/app/lib/chaos-monkeys";

type ChaosMonkeyCardProps = {
  monkey: ChaosMonkey;
  /** Archive view: adds the joke, the credit, and links to the monkeys it riffs on. */
  detailed?: boolean;
  priority?: boolean;
};

export default function ChaosMonkeyCard({ monkey, detailed = false, priority = false }: ChaosMonkeyCardProps) {
  return (
    <figure id={`n${monkey.id}`} className="scroll-mt-24">
      <div className="relative aspect-square overflow-hidden rounded-lg border-2 border-[#1F1F1F] bg-[#F5F2DC]">
        <Image
          src={monkey.image}
          alt={monkey.alt}
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
      </div>
      <figcaption className="mt-3">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8B1E24]">
          Nº {monkey.id} · {formatDropDate(monkey.date)}
        </p>
        <p className="mt-1 font-bebas-neue text-3xl leading-none tracking-wide text-dark">{monkey.title}</p>
        <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-dark-light">{monkey.slogan}</p>
        {detailed && (
          <>
            <p className="mt-3 text-sm leading-relaxed text-dark-light">{monkey.joke}</p>
            <p className="mt-2 text-xs text-gray-500">
              {monkey.credit}
              {monkey.parents.length > 0 && (
                <>
                  {" · Riffs on "}
                  {monkey.parents.map((parent, index) => (
                    <span key={parent}>
                      {index > 0 && ", "}
                      <Link href={`#n${parent}`} className="underline hover:text-dark">
                        Nº {parent}
                      </Link>
                    </span>
                  ))}
                </>
              )}
              {monkey.inspiration && (
                <>
                  {" · Inspired by "}
                  <a href={monkey.inspiration.url} className="underline hover:text-dark" rel="noopener">
                    {monkey.inspiration.label}
                  </a>
                </>
              )}
            </p>
          </>
        )}
      </figcaption>
    </figure>
  );
}
