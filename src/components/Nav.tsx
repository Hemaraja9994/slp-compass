"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/evidence", label: "Evidence" },
  { href: "/assessment", label: "Assessment" },
  { href: "/planning", label: "Planning" },
  { href: "/safety", label: "Safety" },
  { href: "/outcomes", label: "Outcomes" },
  { href: "/about", label: "About" },
];

export default function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="no-print border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-navy text-sm font-bold text-white">
            SLP
          </span>
          <span className="text-lg font-bold text-navy">SLP Compass</span>
        </Link>
        <button
          className="rounded border border-slate-300 px-2 py-1 text-sm text-navy md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          Menu
        </button>
        <nav className="hidden gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded px-3 py-2 text-sm font-medium ${
                path?.startsWith(l.href) ? "bg-navy text-white" : "text-navy hover:bg-navy-light"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      {open && (
        <nav className="flex flex-col border-t border-slate-200 px-4 py-2 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`rounded px-3 py-2 text-sm font-medium ${
                path?.startsWith(l.href) ? "bg-navy text-white" : "text-navy"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
