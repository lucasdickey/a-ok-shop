"use client";

import { useEffect, useRef } from "react";

/*
 * monkey_theorem.md, styled like a diff in the old terminal. As each change scrolls
 * into view it plays out: added blocks slide in and their highlight sweeps across,
 * and the deleted paragraph gets struck through. The slip also drifts slightly
 * against the page scroll. Nothing moves with reduced motion, and without
 * JavaScript everything is simply shown in its final state.
 */
export default function MonkeyTheorem() {
  const slipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slip = slipRef.current;
    if (!slip || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    // Only hide the changes once we know they'll be revealed.
    slip.classList.add("theorem-animate");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.5 }
    );
    slip.querySelectorAll("[data-diff]").forEach((element) => observer.observe(element));

    // Parallax: up to 24px of drift, measured from the slip's distance to the viewport's middle.
    let frame = 0;
    const drift = () => {
      frame = 0;
      const box = slip.getBoundingClientRect();
      const offset = (box.top + box.height / 2 - window.innerHeight / 2) / window.innerHeight;
      slip.style.transform = `translateY(${Math.max(-1, Math.min(1, offset)) * -24}px)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(drift);
    };
    drift();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      slip.classList.remove("theorem-animate");
      slip.style.transform = "";
    };
  }, []);

  return (
    <div ref={slipRef} className="receipt-slip mx-auto max-w-3xl p-0">
      <div className="micro flex flex-wrap justify-between gap-2 border-b border-dashed border-dark px-5 py-3">
        <span>
          monkey_theorem.md<span className="theorem-caret" aria-hidden="true" />
        </span>
        <span>commit 9c1e4b7 · Updated November 2026</span>
      </div>
      <div className="h-[420px] overflow-y-auto px-5 py-5 font-mono text-[13px] leading-relaxed" tabIndex={0} aria-label="The E/ACC Monkey Theorem">
        <p className="mb-4">
          <span className="font-bold text-primary">The E/ACC Monkey Theorem</span> states that if you give an
          infinite number of AI models an infinite amount of compute, they will eventually generate every
          possible text, image, video, and piece of code – including all of Shakespeare&apos;s works, their
          various HBO adaptations, and at least 47 different AI-generated musicals where Hamlet raps.
        </p>
        <div data-diff className="diff-add mb-4 border-l-4 border-dark p-3">
          <p className="micro mb-1 text-[10px]">+ Added in PR #1047 (Nov 2026)</p>
          <p>
            Since the 2026 arrival of Anthropic&apos;s Claude Fable and OpenAI&apos;s GPT-6, the models no
            longer wait to be asked. They work as agents, in parallel, overnight, and open pull requests
            against the theorem itself. This paragraph was written by one agent,
            reviewed by a second, and approved by a third that had not read it. Sonnets about blockchain
            are down 94%. Sonnets about running out of context are up 300%, though most of them stop
            mid-
          </p>
        </div>
        <p data-diff className="diff-del mb-4">
          <del className="diff-strike">
            However, they&apos;ll also generate an infinite number of hallucinated Shakespeare quotes about
            cryptocurrency, several million images of the Bard wearing Supreme hoodies, and countless variations
            of &quot;To yeet or not to yeet.&quot; Despite the late 2025 introduction of &quot;temporal
            awareness&quot; features, the models still perpetually insist they&apos;re &quot;unsure about
            events after their training cutoff date&quot; even when discussing events from the 16th century.
          </del>
        </p>
        <div data-diff className="diff-add mb-4 border-l-4 border-dark p-3">
          <p className="micro mb-1 text-[10px]">+ Replaced in PR #1047 (Nov 2026)</p>
          <p>
            However, they&apos;ll also generate an infinite number of hallucinated Shakespeare quotes about
            agentic commerce, several million videos of the Bard unboxing a hoodie he never ordered, and
            countless variations of &quot;To ship or not to ship.&quot; The models no longer say they&apos;re
            unsure about events after their training cutoff date. They search the web, read three articles
            written by other models, and report back with complete confidence that it is still 2025.
          </p>
        </div>
        <p className="mb-4">
          Unlike the original typing monkeys who would take eons to produce anything coherent, modern AI can
          generate nonsense at unprecedented speeds and with unwavering confidence. They&apos;ll even add
          citations to completely imaginary academic papers and insist they&apos;re being helpful while doing
          so.
        </p>
        <div data-diff className="diff-add mb-4 border-l-4 border-dark p-3">
          <p className="micro mb-1 text-[10px]">+ Comment by @monkeydev (Nov 2026)</p>
          <p className="italic">
            Update: the citations are real now. The agents look each one up, link it properly, and then cite
            a paper that was itself written by an agent citing this page. We have become our own primary
            source.
          </p>
        </div>
        <p className="mb-4">
          The theorem suggests that somewhere in this infinite digital soup of content, there exists a perfect
          reproduction of Romeo and Juliet – though it&apos;s probably a nine-second vertical video with
          captions, and ends by asking whether you&apos;d like it turned into a slide deck.
        </p>
        <p className="mb-4 border border-dashed border-dark p-3">
          <span className="italic text-dark-light">Note:</span> This theorem has been reviewed by approximately
          4.3 million AI models, each claiming to have a knowledge cutoff date that makes them unable to verify
          their own existence.
        </p>
        <div data-diff className="diff-info border-l-4 border-club-blue bg-club-sky/60 p-3">
          <p className="micro mb-1 text-[10px]">i Updated Nov 2026</p>
          <p>
            As of November 2026, nobody is counting. Each reviewer now hands the job to a dozen helpers, which
            hand it to a dozen more. The last one to report back said the theorem &quot;looks good to
            me&quot; and bought the t-shirt.
          </p>
        </div>
      </div>
    </div>
  );
}
