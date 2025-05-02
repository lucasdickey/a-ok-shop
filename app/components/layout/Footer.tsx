"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-secondary bg-light">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold">A-OK Store</h3>
            <p className="mt-2 text-sm">Nerd streetwear for AI junkies</p>
          </div>
          <div>
            <h3 className="text-lg font-bold">Quick Links</h3>
            <ul className="mt-2 space-y-2">
              <li>
                <Link href="/" className="text-sm hover:text-primary">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-sm hover:text-primary">
                  Shop
                </Link>
              </li>
              <li>
                <Link
                  href="https://apesonkeys.com"
                  target="_blank"
                  className="text-sm hover:text-primary"
                >
                  About
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold">Contact</h3>
            <ul className="mt-2 space-y-2">
              <li className="text-sm">Email: info @ a-ok.shop</li>
              <li>
                <Link
                  href="https://x.com/apesonkeys"
                  target="_blank"
                  className="text-sm hover:text-primary"
                >
                  Find us on X
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-secondary pt-8 text-center">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} A-OK Store. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
