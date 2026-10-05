import type { Metadata } from "next";
import GamePlayer from "../components/game/GamePlayer";

const DESCRIPTION = "Touch grass. Or dodge agents. Collect UBI credits, outrun the apes, and win 25% off at A-OK.";

export const metadata: Metadata = {
  title: "Run, Human, Run! · A-OK",
  description: DESCRIPTION,
  openGraph: {
    title: "Run, Human, Run! · A-OK",
    description: DESCRIPTION,
    images: [{ url: "/images/a-ok-8bit-retro.png", alt: "Pixel-art A-OK ape" }],
  },
};

// Direct visits to /game; links elsewhere on the site open the game in a modal instead.
export default function GamePage() {
  return (
    <div className="container mx-auto py-8 relative">
      <div className="w-full max-w-4xl mx-auto">
        <GamePlayer />
      </div>
    </div>
  );
}
