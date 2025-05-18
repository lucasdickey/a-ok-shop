"use client";

export default function GamePage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-black">
      <iframe
        src="https://v0-retro-style-game-concept.vercel.app/"
        width={900}
        height={700}
        style={{
          border: "none",
          borderRadius: "16px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.3)",
          background: "black",
        }}
        allowFullScreen
      />
    </div>
  );
}
