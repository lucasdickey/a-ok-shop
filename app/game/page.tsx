import GamePlayer from "../components/game/GamePlayer";

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
