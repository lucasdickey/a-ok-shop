"use client";

import Link from "next/link";
import { FaYoutube, FaSpotify, FaGithub, FaSoundcloud } from 'react-icons/fa';

// Links are 44px tall below desktop so they are easy to tap.
const linkClass =
  "inline-flex min-h-[44px] items-center no-underline decoration-2 underline-offset-4 hover:underline lg:min-h-0";

export default function Footer() {
  return (
    <footer className="border-t-2 border-dark bg-club-yellow px-5 pb-6 pt-8 sm:px-8 lg:px-12">
      <div className="flex flex-wrap items-center gap-5 pb-8 lg:gap-11">
        <Link
          href="/"
          className="w-full font-[Arial,sans-serif] text-[88px] font-bold leading-none tracking-[-0.09em] no-underline sm:w-auto lg:text-[clamp(70px,10vw,145px)]"
          aria-label="A-OK home"
        >
          A–OK<span className="align-top text-xl tracking-normal">®</span>
        </Link>
        <p className="font-mono text-[11px] leading-relaxed sm:text-xs">
          APES ON KEYS.
          <br />
          HUMANS IN CLOTHES.
          <br />
          THANKS FOR BEING WEIRD.
        </p>
        <div className="barcode h-8 w-full lg:ml-auto lg:h-16 lg:w-[210px]" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-1 gap-8 border-t-2 border-dashed border-dark py-8 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="micro mb-3">A–OK Store</p>
          <p>Nerd streetwear for AI junkies.</p>
        </div>
        <div>
          <p className="micro mb-3">Quick links</p>
          <ul className="lg:space-y-2">
            <li>
              <Link href="/" className={linkClass}>
                Home
              </Link>
            </li>
            <li>
              <Link href="/products" className={linkClass}>
                Shop
              </Link>
            </li>
            <li>
              <Link href="/chaos-monkeys" className={linkClass}>
                Chaos Monkeys
              </Link>
            </li>
            <li>
              <Link href="https://apesonkeys.com" target="_blank" className={linkClass}>
                About
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="micro mb-3">Contact</p>
          <ul className="lg:space-y-2">
            <li>Email: info @ a-ok.shop</li>
            <li>
              <Link href="https://x.com/apesonkeys" target="_blank" className={linkClass}>
                Find us on X
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="micro mb-3">Follow us</p>
          <ul className="lg:space-y-2">
            <li>
              <Link
                href="https://www.youtube.com/@apesonkeys/videos"
                target="_blank"
                className={`${linkClass} flex items-center`}
              >
                <FaYoutube className="mr-2 h-5 w-5" aria-hidden="true" /> APES ON KNOWLEDGE
              </Link>
            </li>
            <li>
              <Link
                href="https://open.spotify.com/show/5mzflcTu9vWhB0Nw0lABRo"
                target="_blank"
                className={`${linkClass} flex items-center`}
              >
                <FaSpotify className="mr-2 h-5 w-5" aria-hidden="true" /> Key To Sleep
              </Link>
            </li>
            <li>
              <Link
                href="https://github.com/lucasdickey/a-ok-shop"
                target="_blank"
                className={`${linkClass} flex items-center`}
              >
                <FaGithub className="mr-2 h-5 w-5" aria-hidden="true" /> Go ape our shit
              </Link>
            </li>
            <li>
              <Link
                href="https://soundcloud.com/lucasdickey"
                target="_blank"
                className={`${linkClass} flex items-center`}
              >
                <FaSoundcloud className="mr-2 h-5 w-5" aria-hidden="true" /> Music To Vibe To
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="micro flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t-2 border-dashed border-dark pt-3 lg:gap-4 lg:pt-5">
        <span>*** KEEP THIS RECEIPT. ***</span>
        <nav aria-label="Footer navigation" className="order-3 flex w-full gap-6 sm:order-none sm:w-auto">
          <Link href="/returns" className={linkClass}>
            Returns
          </Link>
          <Link href="/privacy" className={linkClass}>
            Privacy
          </Link>
          <Link href="/terms" className={linkClass}>
            Terms
          </Link>
        </nav>
        <span>
          &copy; {new Date().getFullYear()} A-OK Store ·{" "}
          <a href="#main" className={linkClass}>
            Back to top ↑
          </a>
        </span>
      </div>
    </footer>
  );
}
