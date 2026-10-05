"use client";

import dynamic from "next/dynamic";

// Dynamically import the game with no SSR (it draws to a canvas)
const RunHumanRun = dynamic(() => import("../../modules/game/components/RunHumanRun"), { ssr: false });

/** Run, Human, Run!: the start screen and the game, used by /game and the game modal. */
export default function GamePlayer() {
  return <RunHumanRun />;
}
