"use client";

import { useEffect, useState } from "react";

export type DebugStats = {
  fps: number;
  frameMs: number;
  worstMs: number;
  playerStepMs: number;
  apeStepMs: number | null;
  frames: number;
  inputs: number;
  marks: number;
  rounds: number;
};

type DebugPanelProps = {
  read: () => DebugStats;
  onMark: () => void;
  onDownload: (notes: string) => void;
};

/** The ?debug=1 readout: timing numbers, a bug marker, notes and the log download. */
export default function DebugPanel({ read, onMark, onDownload }: DebugPanelProps) {
  const [stats, setStats] = useState<DebugStats>(read);
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(true);

  // Four refreshes a second is plenty for reading numbers, and keeps React out of the frame loop.
  useEffect(() => {
    const id = window.setInterval(() => setStats(read()), 250);
    return () => window.clearInterval(id);
  }, [read]);

  return (
    <div className="micro fixed bottom-2 left-2 z-50 w-[220px] border-2 border-dark bg-club-paper p-2 text-[10px] text-dark shadow-hard-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full justify-between font-bold">
        Debug <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <>
          <dl className="mt-1 grid grid-cols-2 gap-x-2">
            <dt>FPS</dt>
            <dd className="text-right">{stats.fps}</dd>
            <dt>Frame</dt>
            <dd className="text-right normal-case">{stats.frameMs.toFixed(1)}ms</dd>
            <dt>Worst 1s</dt>
            <dd className={`text-right normal-case ${stats.worstMs > 50 ? "text-primary" : ""}`}>{stats.worstMs.toFixed(1)}ms</dd>
            <dt>Human step</dt>
            <dd className="text-right normal-case">{stats.playerStepMs}ms</dd>
            <dt>Ape step</dt>
            <dd className="text-right normal-case">{stats.apeStepMs === null ? "–" : `${Math.round(stats.apeStepMs)}ms`}</dd>
            <dt>Round</dt>
            <dd className="text-right">{stats.rounds}</dd>
            <dt>Frames</dt>
            <dd className="text-right">{stats.frames}</dd>
            <dt>Inputs</dt>
            <dd className="text-right">{stats.inputs}</dd>
            <dt>Marks</dt>
            <dd className="text-right">{stats.marks}</dd>
          </dl>
          <button type="button" onClick={onMark} className="mt-2 w-full border-2 border-dark bg-club-yellow py-1 font-bold">
            Mark this moment (B)
          </button>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes: what felt off at each mark"
            rows={3}
            className="mt-2 w-full border border-dark bg-club-slip p-1 normal-case"
          />
          <button type="button" onClick={() => onDownload(notes)} className="mt-1 w-full border-2 border-dark bg-dark py-1 font-bold text-club-yellow">
            Download log
          </button>
        </>
      )}
    </div>
  );
}
