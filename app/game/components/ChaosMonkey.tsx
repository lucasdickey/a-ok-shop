"use client";

import { useEffect, useRef, useState } from "react";

export default function ChaosMonkey() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const livesRef = useRef(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [tokensCollected, setTokensCollected] = useState(0);
  const tokensCollectedRef = useRef(0);
  const [gameStarted, setGameStarted] = useState(false);

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
    function initGame() {
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
    function placeToken() {
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
    function placePowerUp() {
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
    function spawnNewApes(count: number) {
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
    function spawnApeInCorner() {
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
    function moveApes() {
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

    // Check collisions
    function checkCollisions() {
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

        if (maze[nextY][nextX] === 1) {
          // Hit a wall, stop moving
          player.direction = { x: 0, y: 0 };
          return;
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
              tokens.splice(i, 1);
              player.tailLength += 1;
              tokensCollectedRef.current += 1;
              const newTokens = tokensCollectedRef.current;
              setTokensCollected(newTokens);
              setScore((prevScore) => prevScore + 1);

              // Check win condition
              if (newTokens >= TOKENS_TO_WIN) {
                setGameWon(true);
                // Immediately draw the win screen and stop the game loop
                drawWinScreen();
                return; // Exit the function to prevent further processing
              }

              placeToken();
            }
          }
        }

        // Check power-up collisions
        if (powerUps) {
          for (let i = powerUps.length - 1; i >= 0; i--) {
            const powerUp = powerUps[i];
            if (
              powerUp &&
              powerUp.x === player.x &&
              powerUp.y === player.y &&
              powerUp.active
            ) {
              powerUps.splice(i, 1);
              powerMode = true;
              powerModeTimer = 300; // 10 seconds at 30fps
              setScore((prevScore) => prevScore + 5);
              placePowerUp();
            }
          }
        }

        // Check ape collisions
        if (apes) {
          for (let i = apes.length - 1; i >= 0; i--) {
            const ape = apes[i];
            if (!ape) continue;

            if (ape.x === player.x && ape.y === player.y) {
              if (powerMode) {
                // Player eats ape
                const capturedApeIndex = i;
                apes.splice(capturedApeIndex, 1);
                setScore((prevScore) => prevScore + 10);

                // Remove two additional random apes if available
                if (apes.length >= 2) {
                  // Get two random indices to remove
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

                  // Sort indices in descending order to avoid index shifting issues when removing
                  indicesToRemove.sort((a, b) => b - a);

                  // Remove the apes and add points
                  indicesToRemove.forEach((index) => {
                    apes.splice(index, 1);
                    setScore((prevScore) => prevScore + 5); // Bonus points for additional apes
                  });
                }

                // Respawn apes after a delay
                setTimeout(() => {
                  // Determine how many apes to respawn (1 + the number of additional apes removed)
                  const apesToRespawn = Math.min(3, 4 - apes.length); // Ensure we don't exceed 4 total apes
                  spawnNewApes(apesToRespawn);
                }, 3000);
              } else {
                // Ape catches player - ensure this code runs
                livesRef.current = Math.max(0, livesRef.current - 1);
                setLives(livesRef.current);
                if (livesRef.current === 0) {
                  setGameOver(true);
                } else {
                  // Reset player position but keep the game state
                  player.x = Math.floor(GRID_WIDTH / 2);
                  player.y = Math.floor(GRID_HEIGHT / 2);
                  player.trail = [];
                  player.direction = { x: 0, y: 0 };
                }
                return;
              }
            }
          }
        }

        // Update power mode timer
        if (powerMode) {
          powerModeTimer--;
          if (powerModeTimer <= 0) {
            powerMode = false;
          }
        }
      } catch (error) {
        console.error("Error in checkCollisions:", error);
      }
    }

    // Draw game
    function draw() {
      try {
        if (!ctx || !canvas) return;
        // Clear canvas
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw maze
        ctx.fillStyle = "#0000AA";
        for (let y = 0; y < GRID_HEIGHT; y++) {
          for (let x = 0; x < GRID_WIDTH; x++) {
            if (maze[y] && maze[y][x] === 1) {
              ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            }
          }
        }

        // Draw tokens (changed from bananas)
        ctx.fillStyle = "#FFFF00";
        if (tokens) {
          tokens.forEach((token) => {
            if (!token) return;

            // Draw token as a square with a hole in the middle (like a coin)
            ctx.fillRect(
              token.x * GRID_SIZE + GRID_SIZE / 4,
              token.y * GRID_SIZE + GRID_SIZE / 4,
              GRID_SIZE / 2,
              GRID_SIZE / 2
            );
            ctx.fillStyle = "#000";
            ctx.fillRect(
              token.x * GRID_SIZE + (GRID_SIZE * 3) / 8,
              token.y * GRID_SIZE + (GRID_SIZE * 3) / 8,
              GRID_SIZE / 4,
              GRID_SIZE / 4
            );
            ctx.fillStyle = "#FFFF00";
          });
        }

        // Draw power-ups
        ctx.fillStyle = "#00FFFF";
        if (powerUps) {
          powerUps.forEach((powerUp) => {
            if (!powerUp || !powerUp.active) return;

            ctx.beginPath();
            ctx.arc(
              powerUp.x * GRID_SIZE + GRID_SIZE / 2,
              powerUp.y * GRID_SIZE + GRID_SIZE / 2,
              GRID_SIZE / 3,
              0,
              Math.PI * 2
            );
            ctx.fill();
          });
        }

        // Draw player trail
        if (player && player.trail) {
          ctx.fillStyle = "#00FF00";
          player.trail.forEach((pos, i) => {
            if (!pos) return;

            const size = GRID_SIZE * (0.5 + (i / player.trail.length) * 0.5);
            ctx.fillRect(
              pos.x * GRID_SIZE + (GRID_SIZE - size) / 2,
              pos.y * GRID_SIZE + (GRID_SIZE - size) / 2,
              size,
              size
            );
          });
        }

        // Draw player
        if (player) {
          // Draw yellow face
          ctx.beginPath();
          ctx.arc(
            player.x * GRID_SIZE + GRID_SIZE / 2,
            player.y * GRID_SIZE + GRID_SIZE / 2,
            GRID_SIZE / 2,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = "#FFD600";
          ctx.fill();
          ctx.closePath();

          // Draw eyes
          ctx.beginPath();
          ctx.arc(
            player.x * GRID_SIZE + GRID_SIZE / 3,
            player.y * GRID_SIZE + GRID_SIZE / 2.5,
            GRID_SIZE / 10,
            0,
            Math.PI * 2
          );
          ctx.arc(
            player.x * GRID_SIZE + (GRID_SIZE * 2) / 3,
            player.y * GRID_SIZE + GRID_SIZE / 2.5,
            GRID_SIZE / 10,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = "#222";
          ctx.fill();
          ctx.closePath();

          // Draw smile
          ctx.beginPath();
          ctx.arc(
            player.x * GRID_SIZE + GRID_SIZE / 2,
            player.y * GRID_SIZE + (GRID_SIZE * 2) / 3,
            GRID_SIZE / 5,
            0,
            Math.PI
          );
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#222";
          ctx.stroke();
          ctx.closePath();
        }

        // Draw apes
        if (apes) {
          apes.forEach((ape) => {
            if (!ape) return;

            const baseX = ape.x * GRID_SIZE;
            const baseY = ape.y * GRID_SIZE;

            // Ape body
            ctx.fillStyle = powerMode ? "#0000FF" : "#8B4513";
            ctx.fillRect(baseX, baseY, GRID_SIZE, GRID_SIZE);

            // Ape ears
            ctx.fillRect(
              baseX - GRID_SIZE / 6,
              baseY + GRID_SIZE / 6,
              GRID_SIZE / 6,
              GRID_SIZE / 3
            );
            ctx.fillRect(
              baseX + GRID_SIZE,
              baseY + GRID_SIZE / 6,
              GRID_SIZE / 6,
              GRID_SIZE / 3
            );

            // Ape face
            ctx.fillStyle = powerMode ? "#0000AA" : "#A0522D";
            ctx.fillRect(
              baseX + GRID_SIZE / 4,
              baseY + GRID_SIZE / 2,
              GRID_SIZE / 2,
              GRID_SIZE / 3
            );

            // Ape eyes
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(
              baseX + GRID_SIZE / 4,
              baseY + GRID_SIZE / 4,
              GRID_SIZE / 6,
              GRID_SIZE / 6
            );
            ctx.fillRect(
              baseX + (GRID_SIZE * 3) / 5,
              baseY + GRID_SIZE / 4,
              GRID_SIZE / 6,
              GRID_SIZE / 6
            );

            // Ape mouth
            ctx.fillStyle = "#000";
            ctx.fillRect(
              baseX + GRID_SIZE / 3,
              baseY + (GRID_SIZE * 2) / 3,
              GRID_SIZE / 3,
              GRID_SIZE / 6
            );
          });
        }

        // Draw score and lives
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "20px monospace";
        ctx.textAlign = "left";
        ctx.fillText(
          `UBI CREDITS: ${tokensCollectedRef.current}/${TOKENS_TO_WIN}`,
          10,
          30
        );

        // Draw lives
        ctx.fillText(`LIVES: ${livesRef.current}`, canvas.width - 150, 30);

        // Draw power mode timer
        if (powerMode) {
          ctx.fillStyle = "#00FFFF";
          ctx.fillText(
            `POWER: ${Math.ceil(powerModeTimer / 30)}`,
            canvas.width / 2 - 80,
            30
          );
        }
      } catch (error) {
        console.error("Error in draw:", error);
      }
    }

    // Draw win screen
    function drawWinScreen() {
      if (!ctx || !canvas) return;
      // Clear canvas
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Win screen
      ctx.fillStyle = "#00FF00";
      ctx.font = "40px monospace";
      ctx.textAlign = "center";
      ctx.fillText("YOU WIN!", canvas.width / 2, canvas.height / 2 - 40);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "20px monospace";
      ctx.fillText(
        "PRESS SPACE TO PLAY AGAIN",
        canvas.width / 2,
        canvas.height / 2 + 60
      );

      // Cancel the animation frame to stop the game loop
      cancelAnimationFrame(gameLoopId);
    }

    // Game loop
    function gameLoop() {
      try {
        // Global win check: show win screen and stop game if tokensCollectedRef.current >= TOKENS_TO_WIN
        if (tokensCollectedRef.current >= TOKENS_TO_WIN) {
          setGameWon(true);
          drawWinScreen();
          return;
        }
        if (gameWon) {
          // If game is won, draw win screen and stop the loop
          drawWinScreen();
          return;
        }

        if (gameOver) {
          cancelAnimationFrame(gameLoopId);

          // Draw game over screen with overlay
          if (!ctx || !canvas) return;
          // Semi-transparent black overlay
          ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // GAME OVER text
          ctx.fillStyle = "#FF3333";
          ctx.font = "bold 64px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 80);

          // Button-like prompt
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(
            canvas.width / 2 - 180,
            canvas.height / 2 + 40,
            360,
            60,
            20
          );
          ctx.fillStyle = "#222";
          ctx.globalAlpha = 0.95;
          ctx.fill();
          ctx.globalAlpha = 1.0;
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#FF3333";
          ctx.stroke();
          ctx.closePath();
          ctx.restore();

          ctx.fillStyle = "#FF3333";
          ctx.font = "bold 28px monospace";
          ctx.fillText(
            "PRESS SPACE TO RESTART",
            canvas.width / 2,
            canvas.height / 2 + 70
          );

          return;
        }

        // Increment frame counter
        frameCounter++;

        // Only move apes on certain frames based on APE_SPEED
        if (frameCounter % APE_SPEED === 0) {
          moveApes();
        }

        // Only move player on certain frames based on PLAYER_SPEED
        if (frameCounter % PLAYER_SPEED === 0) {
          checkCollisions();
        }

        draw();
        gameLoopId = requestAnimationFrame(gameLoop);
      } catch (error) {
        console.error("Error in game loop:", error);
        // Attempt to recover by reinitializing the game
        try {
          initGame();
          gameLoopId = requestAnimationFrame(gameLoop);
        } catch (recoveryError) {
          console.error(
            "Failed to recover from game loop error:",
            recoveryError
          );
          setGameOver(true); // Force game over if we can't recover
        }
      }
    }

    // Handle keyboard input
    function handleKeyDown(e: KeyboardEvent) {
      try {
        if ((gameOver || gameWon) && e.code === "Space") {
          setGameOver(false);
          setGameWon(false);
          setScore(0);
          livesRef.current = 3;
          setLives(3);
          initGame();
          gameLoopId = requestAnimationFrame(gameLoop);
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
  }, [gameStarted]);

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
              <p className="mb-4 inline-block px-4 py-2 rounded bg-black bg-opacity-50">
                Eating one ape destroys two more!
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
