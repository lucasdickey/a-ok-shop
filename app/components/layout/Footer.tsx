"use client";

import Link from "next/link";
import { FaYoutube, FaSpotify, FaGithub, FaSoundcloud } from 'react-icons/fa';

const footerLinkClass =
  "group inline-flex items-center text-sm text-bone/70 transition-all duration-200 hover:text-bone hover:translate-x-1";

export default function Footer() {
  return (
    <footer className="border-t-4 border-maroon bg-charcoal-dark text-bone">
      <div className="container py-10 md:py-14">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="font-bebas-neue text-2xl tracking-wide text-bone">
              A-OK Store
            </h3>
            <p className="mt-2 text-sm text-bone/70">
              Nerd streetwear for AI junkies
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-bone/50">
              Quick Links
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/" className={footerLinkClass}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/products" className={footerLinkClass}>
                  Shop
                </Link>
              </li>
              <li>
                <Link
                  href="https://apesonkeys.com"
                  target="_blank"
                  className={footerLinkClass}
                >
                  About
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-bone/50">
              Contact
            </h3>
            <ul className="mt-3 space-y-2">
              <li className="text-sm text-bone/70">Email: info @ a-ok.shop</li>
              <li>
                <Link
                  href="https://x.com/apesonkeys"
                  target="_blank"
                  className={footerLinkClass}
                >
                  Find us on X
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-bone/50">
              Follow Us
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="https://www.youtube.com/@apesonkeys/videos"
                  target="_blank"
                  className={footerLinkClass}
                >
                  <FaYoutube className="mr-2 h-5 w-5 transition-colors duration-200 group-hover:text-[#FF0000]" />
                  APES ON KNOWLEDGE
                </Link>
              </li>
              <li>
                <Link
                  href="https://open.spotify.com/show/5mzflcTu9vWhB0Nw0lABRo"
                  target="_blank"
                  className={footerLinkClass}
                >
                  <FaSpotify className="mr-2 h-5 w-5 transition-colors duration-200 group-hover:text-[#1DB954]" />
                  Key To Sleep
                </Link>
              </li>
              <li>
                <Link
                  href="https://github.com/lucasdickey/a-ok-shop"
                  target="_blank"
                  className={footerLinkClass}
                >
                  <FaGithub className="mr-2 h-5 w-5 transition-colors duration-200 group-hover:text-white" />
                  Go ape our shit
                </Link>
              </li>
              <li>
                <Link
                  href="https://soundcloud.com/lucasdickey"
                  target="_blank"
                  className={footerLinkClass}
                >
                  <FaSoundcloud className="mr-2 h-5 w-5 transition-colors duration-200 group-hover:text-[#FF5500]" />
                  Music To Vibe To
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-bone/10 pt-6 text-center">
          <p className="text-sm text-bone/50">
            &copy; {new Date().getFullYear()} A-OK Store. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
