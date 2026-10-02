"use client";

import { useEffect, useSyncExternalStore } from "react";
import { track } from "@/app/lib/analytics";
import Asterisk from "@/app/components/Asterisk";

/*
 * "Print this" on a Chaos Monkey: customers ask for a monkey to become a tee, GitHub-star style.
 * One shared store per page, so every button shares a single request for the counts.
 * Counts under 5 come back as null and aren't shown.
 */
type State = {
  counts: Record<string, number | null>;
  mine: Set<string>;
  /** null while the counts load; false if requests are switched off. */
  available: boolean | null;
  busy: Set<string>;
  note: Record<string, string>;
};

let state: State = { counts: {}, mine: new Set(), available: null, busy: new Set(), note: {} };
const listeners = new Set<() => void>();
const emit = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

let loading: Promise<void> | null = null;
function load() {
  loading ??= fetch("/api/print-requests", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((data: { counts: Record<string, number | null>; mine: string[] } | null) => {
      emit(data ? { counts: data.counts, mine: new Set(data.mine), available: true } : { available: false });
    })
    .catch(() => emit({ available: false }));
  return loading;
}

async function toggle(id: string) {
  if (state.busy.has(id)) return;
  const want = !state.mine.has(id);
  const previous = { mine: state.mine, counts: state.counts };
  // Show the change right away; undo it if the server says no.
  const mine = new Set(state.mine);
  if (want) mine.add(id);
  else mine.delete(id);
  emit({ mine, busy: new Set(state.busy).add(id), note: { ...state.note, [id]: "" } });

  try {
    const response = await fetch("/api/print-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, want }),
    });
    const data = await response.json();
    if (!response.ok) {
      const note = data.error === "address_limit" ? "Already asked from this network." : "Try again later.";
      emit({ ...previous, note: { ...state.note, [id]: note } });
    } else {
      emit({ counts: { ...state.counts, [id]: data.count } });
      track("print_request_changed", { monkey_id: id, wanted: want });
    }
  } catch {
    emit({ ...previous, note: { ...state.note, [id]: "Try again later." } });
  } finally {
    const busy = new Set(state.busy);
    busy.delete(id);
    emit({ busy });
  }
}

export default function PrintRequestButton({ id, title }: { id: string; title: string }) {
  const current = useSyncExternalStore(subscribe, () => state, () => state);
  useEffect(() => {
    load();
  }, []);

  // Keep the button's space while the counts load, so nothing below moves when it appears.
  if (current.available === null) return <div className="mt-3 h-12" aria-hidden="true" />;
  if (!current.available) return null;

  const wanted = current.mine.has(id);
  const count = current.counts[id];
  const note = current.note[id];

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="inline-flex border-2 border-dark bg-club-slip shadow-hard-sm">
        <button
          type="button"
          onClick={() => toggle(id)}
          aria-pressed={wanted}
          aria-label={wanted ? `Take back your request to print ${title}` : `Ask us to print ${title}`}
          className={`star-trigger flex min-h-[44px] items-center gap-2 px-3 text-sm font-semibold ${
            wanted ? "bg-dark text-club-paper" : "hover:bg-club-yellow"
          }`}
        >
          <span aria-hidden="true" className={`star-spin text-lg leading-none ${wanted ? "text-club-yellow" : "text-primary"}`}>
            <Asterisk />
          </span>
          {wanted ? "Asked to print" : "Print this"}
        </button>
        {count !== null && count !== undefined && (
          <span className="flex min-h-[44px] items-center border-l-2 border-dark px-3 font-mono text-sm" aria-label={`${count} requests`}>
            {count}
          </span>
        )}
      </div>
      <span className="micro text-[10px] text-dark-light" role="status">
        {note}
      </span>
    </div>
  );
}
