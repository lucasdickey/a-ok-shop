"use client";

import { useEffect, useRef, useState } from "react";

interface GameProps {
  gameStarted: boolean;
  setGameStarted: (value: boolean) => void;
  score: number;
  setScore: (value: number | ((prev: number) => number)) => void;
  lives: number;
  setLives: (value: number) => void;
  gameOver: boolean;
  setGameOver: (value: boolean) => void;
  gameWon: boolean;
  setGameWon: (value: boolean) => void;
  discountCode: string;
  setDiscountCode: (value: string) => void;
  tokensCollected: number;
  setTokensCollected: (value: number | ((prev: number) => number)) => void;
  onGameComplete: (success: boolean) => void;
}

interface Ape {
  x: number;
  y: number;
  direction: { x: number; y: number };
}

const ChaosMonkey: React.FC<GameProps> = ({
  gameStarted,
  setGameStarted,
  score,
  setScore,
  lives,
  setLives,
  gameOver,
  setGameOver,
  gameWon,
  setGameWon,
  discountCode,
  setDiscountCode,
  tokensCollected,
  setTokensCollected,
  onGameComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isClaimingDiscount, setIsClaimingDiscount] = useState(false);
  const livesRef = useRef(3);
  const tokensCollectedRef = useRef(0);

  useEffect(() => {
    if (!gameStarted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Game constants
    const GRID_SIZE = 20;
    const GRID_WIDTH = Math.floor(canvas.width / GRID_SIZE);
    const GRID_HEIGHT = Math.floor(canvas.height / GRID_SIZE);
    const PLAYER_SPEED = 6; // Player moves every 6 frames (lower = faster)
    const APE_SPEED = 10; // Apes move every 10 frames (lower = faster)
    const TOKENS_TO_WIN = 25; // Number of tokens needed to win
    let frameCounter = 0;

    // Game state
    let player = {
      x: Math.floor(GRID_WIDTH / 2),
      y: Math.floor(GRID_HEIGHT / 2),
      trail: [] as Array<{ x: number; y: number }>,
      tailLength: 5,
      direction: { x: 0, y: 0 },
    };
    let tokens: Array<{ x: number; y: number }> = [];
    let powerUps: Array<{ x: number; y: number; active: boolean }> = [];
    let apes: Array<{
      x: number;
      y: number;
      direction: { x: number; y: number };
    }> = [];
    let powerMode = false;
    let powerModeTimer = 0;
    let gameLoopId: number;
    let apeIntervalId: number | undefined;

    // Maze layout (1 = wall, 0 = path)
    const maze: number[][] = Array(GRID_HEIGHT)
      .fill(0)
      .map(() => Array(GRID_WIDTH).fill(0));

    // Create simple maze with walls
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        // Border walls
        if (
          x === 0 ||
          y === 0 ||
          x === GRID_WIDTH - 1 ||
          y === GRID_HEIGHT - 1
        ) {
          maze[y][x] = 1;
        }
        // Some internal walls - make sure we don't exceed array bounds
        else if (
          (x === 10 && y < 15 && y > 5) ||
          (y === 10 && x < 15 && x > 5 && x !== 10) ||
          (x === 30 && y > 5 && y < Math.min(35, GRID_HEIGHT - 1)) ||
          (y === 30 && x > 5 && x < Math.min(35, GRID_WIDTH - 1) && x !== 30)
        ) {
          // Make sure we're within bounds
          if (y < GRID_HEIGHT && x < GRID_WIDTH) {
            maze[y][x] = 1;
          }
        }
      }
    }

    // Initialize game
    const initGame = () => {
      try {
        // Place player
        player = {
          x: Math.floor(GRID_WIDTH / 2),
          y: Math.floor(GRID_HEIGHT / 2),
          trail: [],
          tailLength: 5,
          direction: { x: 0, y: 0 }, // Ensure this is always defined
        };

        // Place tokens
        tokens = [];
        for (let i = 0; i < 10; i++) {
          placeToken();
        }

        // Place power-ups
        powerUps = [];
        for (let i = 0; i < 3; i++) {
          placePowerUp();
        }

        // Place apes
        apes = [];
        for (let i = 0; i < 4; i++) {
          spawnApeInCorner();
        }

        powerMode = false;
        powerModeTimer = 0;
        setTokensCollected(0);
        tokensCollectedRef.current = 0;
        setScore(0);
      } catch (error) {
        console.error("Error in initGame:", error);
      }
    }

    // Place a token at a random empty position
    const placeToken = () => {
      try {
        let x: number, y: number;
        let attempts = 0;
        const maxAttempts = 100; // Prevent infinite loops

        do {
          x = Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1;
          y = Math.floor(Math.random() * (GRID_HEIGHT - 2)) + 1;
          attempts++;

          if (attempts > maxAttempts) {
            console.warn("Max attempts reached when placing token");
            return; // Prevent infinite loop
          }
        } while (
          y < 0 ||
          y >= GRID_HEIGHT ||
          x < 0 ||
          x >= GRID_WIDTH || // Check bounds
          maze[y][x] === 1 ||
          tokens.some((t) => t && t.x === x && t.y === y) ||
          powerUps.some((p) => p && p.x === x && p.y === y) ||
          (player && player.x === x && player.y === y) ||
          apes.some((a) => a && a.x === x && a.y === y)
        );

        tokens.push({ x, y });
      } catch (error) {
        console.error("Error in placeToken:", error);
      }
    }

    // Place a power-up at a random empty position
    const placePowerUp = () => {
      try {
        let x: number, y: number;
        let attempts = 0;
        const maxAttempts = 100; // Prevent infinite loops

        do {
          x = Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1;
          y = Math.floor(Math.random() * (GRID_HEIGHT - 2)) + 1;
          attempts++;

          if (attempts > maxAttempts) {
            console.warn("Max attempts reached when placing power-up");
            return; // Prevent infinite loop
          }
        } while (
          y < 0 ||
          y >= GRID_HEIGHT ||
          x < 0 ||
          x >= GRID_WIDTH || // Check bounds
          maze[y][x] === 1 ||
          tokens.some((t) => t && t.x === x && t.y === y) ||
          powerUps.some((p) => p && p.x === x && p.y === y) ||
          (player && player.x === x && player.y === y) ||
          apes.some((a) => a && a.x === x && a.y === y)
        );

        powerUps.push({ x, y, active: true });
      } catch (error) {
        console.error("Error in placePowerUp:", error);
      }
    }

    // Spawn new apes from existing ones or from corners if no apes exist
    const spawnNewApes = (count: number) => {
      try {
        for (let j = 0; j < count; j++) {
          if (apes && apes.length > 0) {
            // Choose a random existing ape to spawn from
            const parentApe = apes[Math.floor(Math.random() * apes.length)];
            if (!parentApe) {
              spawnApeInCorner();
              continue;
            }

            // Try to find a valid position near the parent ape
            const possibleDirections = [
              { x: -1, y: 0 },
              { x: 1, y: 0 },
              { x: 0, y: -1 },
              { x: 0, y: 1 },
              { x: -1, y: -1 },
              { x: 1, y: 1 },
              { x: -1, y: 1 },
              { x: 1, y: -1 },
            ];

            // Shuffle directions for randomness
            for (let i = possibleDirections.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [possibleDirections[i], possibleDirections[j]] = [
                possibleDirections[j],
                possibleDirections[i],
              ];
            }

            // Try each direction until we find a valid spawn point
            let spawned = false;
            for (const dir of possibleDirections) {
              const newX = parentApe.x + dir.x;
              const newY = parentApe.y + dir.y;

              // Check if position is valid (not a wall, not occupied)
              if (
                newX > 0 &&
                newX < GRID_WIDTH - 1 &&
                newY > 0 &&
                newY < GRID_HEIGHT - 1 &&
                maze[newY] &&
                maze[newY][newX] === 0 &&
                !apes.some((a) => a && a.x === newX && a.y === newY) &&
                !(player && player.x === newX && player.y === newY)
              ) {
                apes.push({
                  x: newX,
                  y: newY,
                  direction: { x: 0, y: 0 },
                });
                spawned = true;
                break;
              }
            }

            // If we couldn't spawn near an existing ape, use the old corner method
            if (!spawned) {
              spawnApeInCorner();
            }
          } else {
            // No existing apes, spawn in corner
            spawnApeInCorner();
          }
        }
      } catch (error) {
        console.error("Error in spawnNewApes:", error);
      }
    }

    // Helper function to spawn an ape in a corner
    const spawnApeInCorner = () => {
      try {
        const positions = [
          { x: 2, y: 2 },
          { x: GRID_WIDTH - 3, y: 2 },
          { x: 2, y: GRID_HEIGHT - 3 },
          { x: GRID_WIDTH - 3, y: GRID_HEIGHT - 3 },
        ];
        const pos = positions[Math.floor(Math.random() * positions.length)];
        apes.push({
          x: pos.x,
          y: pos.y,
          direction: { x: 0, y: 0 },
        });
      } catch (error) {
        console.error("Error in spawnApeInCorner:", error);
      }
    }

    // Move apes toward player with improved pursuit AI
    const moveApes = () => {
      try {
        if (!apes || !player) return;

        for (let i = 0; i < apes.length; i++) {
          const ape = apes[i];
          if (!ape || typeof ape.x !== "number" || typeof ape.y !== "number") {
            continue; // Skip invalid apes
          }

          // Check if ape is in a corner or against a wall
          // Make sure we're not accessing out of bounds maze cells
          const leftBlocked =
            ape.x <= 0 || !maze[ape.y] || maze[ape.y][ape.x - 1] === 1;
          const rightBlocked =
            ape.x >= GRID_WIDTH - 1 ||
            !maze[ape.y] ||
            maze[ape.y][ape.x + 1] === 1;
          const upBlocked =
            ape.y <= 0 || !maze[ape.y - 1] || maze[ape.y - 1][ape.x] === 1;
          const downBlocked =
            ape.y >= GRID_HEIGHT - 1 ||
            !maze[ape.y + 1] ||
            maze[ape.y + 1][ape.x] === 1;

          // Count how many directions are blocked
          const blockedCount = [
            leftBlocked,
            rightBlocked,
            upBlocked,
            downBlocked,
          ].filter((blocked) => blocked).length;
          const isStuck = blockedCount >= 2;

          // In power mode, apes try to run away from player
          // Otherwise, they aggressively pursue the player
          const targetX = powerMode
            ? ape.x < player.x
              ? ape.x - 1
              : ape.x + 1
            : player.x;
          const targetY = powerMode
            ? ape.y < player.y
              ? ape.y - 1
              : ape.y + 1
            : player.y;

          // Determine possible directions
          const possibleMoves = [];

          if (!leftBlocked) possibleMoves.push({ x: -1, y: 0 });
          if (!rightBlocked) possibleMoves.push({ x: 1, y: 0 });
          if (!upBlocked) possibleMoves.push({ x: 0, y: -1 });
          if (!downBlocked) possibleMoves.push({ x: 0, y: 1 });

          if (possibleMoves.length > 0) {
            // Only use randomness if the ape is stuck or very occasionally (10% chance)
            const useRandomMove = isStuck || Math.random() < 0.1;

            if (!useRandomMove) {
              // Find the move that gets closest to the player (or away in power mode)
              let bestMove = possibleMoves[0];
              let bestDistance = Number.POSITIVE_INFINITY;

              possibleMoves.forEach((move) => {
                const newX = ape.x + move.x;
                const newY = ape.y + move.y;

                // Calculate Manhattan distance to target
                const distance = powerMode
                  ? -1 * (Math.abs(newX - targetX) + Math.abs(newY - targetY)) // Negative for fleeing
                  : Math.abs(newX - targetX) + Math.abs(newY - targetY); // Positive for chasing

                if (distance < bestDistance) {
                  bestDistance = distance;
                  bestMove = move;
                }
              });

              ape.direction = bestMove;
            } else {
              // Random move to help escape corners
              ape.direction =
                possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            }
          } else if (
            !ape.direction ||
            typeof ape.direction.x !== "number" ||
            typeof ape.direction.y !== "number"
          ) {
            // If no moves are possible and direction is invalid, set a default
            ape.direction = { x: 0, y: 0 };
          }

          // Update ape position
          ape.x += ape.direction.x;
          ape.y += ape.direction.y;

          // Ensure ape stays within bounds
          ape.x = Math.max(0, Math.min(GRID_WIDTH - 1, ape.x));
          ape.y = Math.max(0, Math.min(GRID_HEIGHT - 1, ape.y));

          // Check if ape has collided with the player's head
          if (ape.x === player.x && ape.y === player.y) {
            if (powerMode) {
              // Player eats ape when powered up
              const capturedApeIndex = i;
              apes.splice(capturedApeIndex, 1);
              setScore((prevScore) => prevScore + 10);

              // Remove two additional random apes if available
              if (apes.length >= 2) {
                const indicesToRemove: number[] = [];
                while (
                  indicesToRemove.length < 2 &&
                  indicesToRemove.length < apes.length
                ) {
                  const randomIndex = Math.floor(Math.random() * apes.length);
                  if (!indicesToRemove.includes(randomIndex)) {
                    indicesToRemove.push(randomIndex);
                  }
                }

                indicesToRemove.sort((a, b) => b - a);

                indicesToRemove.forEach((index) => {
                  apes.splice(index, 1);
                  setScore((prevScore) => prevScore + 5);
                });
              }

              // Respawn apes after a delay
              setTimeout(() => {
                const apesToRespawn = Math.min(3, 4 - apes.length);
                spawnNewApes(apesToRespawn);
              }, 3000);
              return;
            } else {
              // Ape catches player
              livesRef.current = Math.max(0, livesRef.current - 1);
              setLives(livesRef.current);
              if (livesRef.current === 0) {
                setGameOver(true);
              } else {
                player.x = Math.floor(GRID_WIDTH / 2);
                player.y = Math.floor(GRID_HEIGHT / 2);
                player.trail = [];
                player.direction = { x: 0, y: 0 };
              }
              return;
            }
          }
        }
      } catch (error) {
        console.error("Error in moveApes:", error);
      }
    }

    // Draw function
    const draw = () => {
      try {
        if (!ctx || !canvas) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw maze
        ctx.fillStyle = "#0000AA";
        for (let y = 0; y < GRID_HEIGHT; y++) {
          for (let x = 0; x < GRID_WIDTH; x++) {
            if (maze[y] && maze[x] && maze[y][x] === 1) {
              ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            }
          }
        }
      } catch (error) {
        console.error("Error in draw:", error);
      }
    };

    // Check collisions
    const checkCollisions = () => {
      try {
        // Ensure player and player.direction are defined
        if (!player || !player.direction) {
          console.error("Player or player direction is undefined");
          return;
        }

        // Check wall collisions
        const nextX = player.x + (player.direction.x || 0);
        const nextY = player.y + (player.direction.y || 0);

        // Make sure we're not accessing out of bounds maze cells
        if (
          nextY < 0 ||
          nextY >= maze.length ||
          nextX < 0 ||
          nextX >= maze[0].length
        ) {
          player.direction = { x: 0, y: 0 };
          return;
        }


        if (maze[nextY] && maze[nextY][nextX] === 1) {
          // Hit a wall, stop moving
          player.direction = { x: 0, y: 0 };
          return;
        }


        // Move player if there's a direction
        if (player.direction.x !== 0 || player.direction.y !== 0) {
          player.x = nextX;
          player.y = nextY;
        }

        // Update player position
        player.x = nextX;
        player.y = nextY;

        // Add current position to trail
        player.trail.push({ x: player.x, y: player.y });

        // Trim trail to tail length
        while (player.trail.length > player.tailLength) {
          player.trail.shift();
        }

        // Check token collisions
        if (tokens) {
          for (let i = tokens.length - 1; i >= 0; i--) {
            const token = tokens[i];
            if (token && token.x === player.x && token.y === player.y) {
              // Token collected
              tokens.splice(i, 1);
              setScore(prev => prev + 1);
              tokensCollectedRef.current++;
              
              // Check win condition
              if (tokensCollectedRef.current >= TOKENS_TO_WIN) {
                setGameWon(true);
                setGameOver(true);
                
                // Generate discount code when player wins
                if (!discountCode) {
                  generateDiscountCode();
                }
                return;
              }
              
              // Place new token
              placeToken();
              
              // Every 5 tokens, increase tail length and spawn new ape
              if (tokensCollectedRef.current % 5 === 0) {
                player.tailLength++;
                spawnNewApes(1);
              }
            }
          }
        }
    }

    // Handle keyboard input
    const handleKeyDown = (e: KeyboardEvent) => {
      try {
        if ((gameOver || gameWon) && e.code === "Space") {
          setGameOver(false);
          setGameWon(false);
          setScore(0);
          livesRef.current = 3;
          setLives(3);
          initGame();
          if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
          }
          gameLoopId = requestAnimationFrame(runGameLoop);
          return;
        }

        if (!player || !player.direction) {
          player = {
            ...player,
            direction: { x: 0, y: 0 },
          };
        }

        switch (e.code) {
          case "ArrowLeft":
            if (player.direction.x === 0) {
              // Prevent 180-degree turns
              player.direction = { x: -1, y: 0 };
            }
            break;
          case "ArrowRight":
            if (player.direction.x === 0) {
              player.direction = { x: 1, y: 0 };
            }
            break;
          case "ArrowUp":
            if (player.direction.y === 0) {
              player.direction = { x: 0, y: -1 };
            }
            break;
          case "ArrowDown":
            if (player.direction.y === 0) {
              if (player.direction.y === 0) {
                player.direction = { x: 0, y: 1 };
              }
            }
            break;
        }
      } catch (error) {
        console.error("Error in handleKeyDown:", error);
      }
    }

    // --- Ape spawn interval ---
    apeIntervalId = window.setInterval(() => {
      if (apes.length < 8) {
        spawnNewApes(1);
      }
    }, 10000);

    // Initialize game
    initGame();

    // Start game loop
    gameLoopId = requestAnimationFrame(gameLoop);

    // Add event listeners
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(gameLoopId);
      if (apeIntervalId) clearInterval(apeIntervalId);
    };
  }, [gameStarted, discountCode]);

  // Generate discount code when player wins
  const generateDiscountCode = async () => {
    try {
      setIsClaimingDiscount(true);
      const response = await fetch('/api/discount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate discount code');
      }
      
      const data = await response.json();
      setDiscountCode(data.code);
    } catch (error) {
      console.error('Error generating discount code:', error);
      setDiscountError('Failed to generate discount code. Please try again.');
    } finally {
      setIsClaimingDiscount(false);
    }
  };
  
  // Main game effect
  useEffect(() => {
    // Only run when game is started
    if (!gameStarted) return;

    // Get canvas and context
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Game state variables
    let gameLoopId: number;
    let apeIntervalId: NodeJS.Timeout;
    let apes: Array<{ x: number; y: number; direction: { x: number; y: number } }> = [];
    
    // Initialize game
    const initGame = () => {
      // Reset game state
      setScore(0);
      setLives(3);
      setGameOver(false);
      setGameWon(false);
      setTokensCollected(0);
      
      // Initialize game objects
      apes = [];
      // Add more initialization code here...
    };
    
    // Spawn new apes
    const spawnNewApes = (count: number) => {
      for (let i = 0; i < count; i++) {
        apes.push({
          x: Math.floor(Math.random() * 20),
          y: Math.floor(Math.random() * 15),
          direction: { x: 0, y: 0 }
        });
      }
    };
    
    // Draw function
    const draw = () => {
      try {
        if (!ctx || !canvas) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw game objects
        // Example: Draw player, apes, etc.
        
      } catch (error) {
        console.error('Error in draw:', error);
      }
    };
    
    // Game loop function
    const runGameLoop = () => {
      try {
        if (!ctx || !canvas) return;
        
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw game state
        if (gameOver) {
          // Draw game over screen
          ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // GAME OVER text
          ctx.fillStyle = "#FF3333";
          ctx.font = "bold 64px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            gameWon ? "YOU WIN!" : "GAME OVER", 
            canvas.width / 2, 
            canvas.height / 2 - 80
          );

          // Show discount code if player won
          if (gameWon) {
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "24px monospace";
            ctx.fillText(
              `Your 25% OFF code: ${discountCode || 'GENERATING...'}`,
              canvas.width / 2,
              canvas.height / 2
            );

            // Show copy button
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(
              canvas.width / 2 - 100,
              canvas.height / 2 + 40,
              200,
              50,
              10
            );
            ctx.fillStyle = "#4CAF50";
            ctx.globalAlpha = 0.9;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#FFFFFF";
            ctx.stroke();
            ctx.closePath();
            ctx.restore();

            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 18px monospace";
            ctx.fillText(
              "COPY CODE",
              canvas.width / 2,
              canvas.height / 2 + 70
            );
          }

          // Restart prompt
          ctx.fillStyle = "#FF3333";
          ctx.font = "bold 24px monospace";
          ctx.fillText(
            "PRESS SPACE TO RESTART",
            canvas.width / 2,
            canvas.height / 2 + 120
          );
          
          return;
        }
        
        // Draw the game
        draw();
        
        // Continue the game loop
        gameLoopId = requestAnimationFrame(runGameLoop);
      } catch (error) {
        console.error("Error in game loop:", error);
        // Attempt to recover by reinitializing the game
        try {
          initGame();
          gameLoopId = requestAnimationFrame(runGameLoop);
        } catch (recoveryError) {
          console.error("Failed to recover from game loop error:", recoveryError);
          setGameOver(true);
        }
      }
    };
    
    // Start the game
    initGame();
    gameLoopId = requestAnimationFrame(runGameLoop);
    
    // Set up ape spawning interval
    apeIntervalId = setInterval(() => {
      if (apes.length < 8) {
        spawnNewApes(1);
      }
    }, 10000);
    
    // Cleanup
    return () => {
      cancelAnimationFrame(gameLoopId);
      clearInterval(apeIntervalId);
    };
  }, [gameStarted, discountCode, gameOver, gameWon]);

  // Keep refs in sync with state for display
  useEffect(() => {
    tokensCollectedRef.current = tokensCollected;
  }, [tokensCollected]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-[800px] mx-auto">
      {!gameStarted ? (
        <div
          className="flex flex-col items-center justify-center p-8 w-full h-[600px] relative overflow-hidden"
          style={{
            backgroundImage: "url('/images/a-ok-8bit-retro.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-black bg-opacity-60 z-0" />
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-5xl mb-24 text-center font-bold text-white drop-shadow-lg">
              RUN, HUMAN, RUN!
            </h2>
            <div className="mb-8 text-center text-white drop-shadow-lg font-bold">
              <p className="mb-4 inline-block px-4 py-2 rounded bg-black bg-opacity-50">
                Use arrow keys to move
              </p>
              <p className="mb-4 inline-block px-4 py-2 rounded bg-black bg-opacity-50">
                Collect 25 UBI Credits to win—and win a 25% off discount code
              </p>
              <p className="mb-4 inline-block px-4 py-2 rounded bg-black bg-opacity-50">
                Blue power-ups let you eat apes!
              </p>
              <p className="mb-4 inline-block px-4 py-2 rounded bg-black bg-opacity-50">
                Avoid apes unless you have power-up
              </p>
            </div>
            <button
              onClick={() => setGameStarted(true)}
              className="px-8 py-4 mt-16 bg-green-500 text-white font-bold rounded shadow-lg"
            >
              START GAME
            </button>
          </div>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border border-gray-800 bg-black"
          tabIndex={0}
        />
      )}
    </div>
  );
}
