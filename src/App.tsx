import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { CAR_PRESETS, PlayerInfo, RacerTelemetry, RoomState } from './types/game';
import { LobbyView } from './components/LobbyView';
import { PaddockView } from './components/PaddockView';
import { IsometricCanvas } from './game/IsometricCanvas';
import { RaceHud } from './game/RaceHud';
import { PodiumModal } from './components/PodiumModal';
import { sound } from './audio/soundEngine';

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initialJoinCode, setInitialJoinCode] = useState<string>('');
  const [isSoloPractice, setIsSoloPractice] = useState(false);

  // Solo practice simulation ref
  const soloLoopRef = useRef<number | null>(null);

  // Initialize Socket.io connection and URL parameter checks
  useEffect(() => {
    // Check URL parameters for ?join=CODE
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('join');
    if (codeParam) {
      setInitialJoinCode(codeParam.toUpperCase());
    }

    // Connect to current origin Socket.io
    const newSocket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setLocalPlayerId(newSocket.id || null);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('room:joined', (data: { room: RoomState; playerId: string }) => {
      setRoom(data.room);
      setLocalPlayerId(data.playerId);
      setErrorMessage(null);
      setIsSoloPractice(false);
    });

    newSocket.on('room:update', (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
    });

    newSocket.on('race:countdown', (data: { count: number }) => {
      setRoom((prev) => {
        if (!prev) return null;
        return { ...prev, countdown: data.count, phase: data.count === 0 ? 'RACING' : 'COUNTDOWN' };
      });
    });

    newSocket.on('race:tick', (data: { racers: Record<string, RacerTelemetry> }) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          racers: { ...prev.racers, ...data.racers },
        };
      });
    });

    newSocket.on('race:shift', (data: { playerId: string; gear: number; quality: string }) => {
      if (data.playerId === newSocket.id) {
        sound.playShiftPop(data.quality === 'PERFECT');
      }
    });

    newSocket.on('race:finish', (data: { winnerId: string | null; racers: Record<string, RacerTelemetry> }) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          phase: 'FINISHED',
          winnerId: data.winnerId,
          racers: data.racers,
        };
      });
    });

    newSocket.on('room:error', (data: { message: string }) => {
      setErrorMessage(data.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      if (soloLoopRef.current) cancelAnimationFrame(soloLoopRef.current);
    };
  }, []);

  // Handlers for Lobby
  const handleCreateRoom = (name: string, carModel: string, color: string) => {
    if (!socket) return;
    socket.emit('room:create', { name, carModel, color });
  };

  const handleJoinRoom = (code: string, name: string, carModel: string, color: string) => {
    if (!socket) return;
    socket.emit('room:join', { roomCode: code, name, carModel, color });
  };

  // Solo Practice Mode Simulator
  const handleSoloPractice = (name: string, carModel: string, color: string) => {
    setIsSoloPractice(true);
    const mockLocalId = 'player-solo';
    const mockBotId = 'player-bot';

    const mockRoom: RoomState = {
      code: 'SOLO',
      phase: 'LOBBY',
      players: [
        {
          id: mockLocalId,
          name: name || 'Racer 1',
          carModel,
          color,
          lane: 0,
          isReady: false,
          isHost: true,
        },
        {
          id: mockBotId,
          name: 'AI Rival (Phantom)',
          carModel: 'turbo-phantom',
          color: '#06B6D4',
          lane: 1,
          isReady: true,
          isHost: false,
        },
      ],
      countdown: 3,
      trackLength: 400,
      racers: {
        [mockLocalId]: {
          id: mockLocalId,
          distance: 0,
          speed: 0,
          gear: 1,
          rpm: 1000,
          nitro: 100,
          nitroActive: false,
          isFinished: false,
          finishTime: null,
          perfectShifts: 0,
          totalShifts: 0,
          maxSpeedReached: 0,
          falseStart: false,
        },
        [mockBotId]: {
          id: mockBotId,
          distance: 0,
          speed: 0,
          gear: 1,
          rpm: 1000,
          nitro: 100,
          nitroActive: false,
          isFinished: false,
          finishTime: null,
          perfectShifts: 0,
          totalShifts: 0,
          maxSpeedReached: 0,
          falseStart: false,
        },
      },
      winnerId: null,
      startTime: null,
    };

    setLocalPlayerId(mockLocalId);
    setRoom(mockRoom);
  };

  // Solo practice simulation runner
  const startSoloSimulation = useCallback(() => {
    let countdown = 3;
    setRoom((prev) => (prev ? { ...prev, phase: 'COUNTDOWN', countdown } : null));

    const countdownTimer = setInterval(() => {
      countdown -= 1;
      setRoom((prev) => (prev ? { ...prev, countdown } : null));

      if (countdown === 0) {
        clearInterval(countdownTimer);
        const startTime = Date.now();
        setRoom((prev) => (prev ? { ...prev, phase: 'RACING', startTime } : null));

        // Start 60Hz local loop for solo run
        let lastTime = performance.now();
        const loop = (currentTime: number) => {
          const dt = Math.min(0.05, (currentTime - lastTime) / 1000);
          lastTime = currentTime;

          setRoom((prev) => {
            if (!prev || prev.phase !== 'RACING') return prev;

            const bot = prev.racers['player-bot'];
            const local = prev.racers['player-solo'];
            if (!bot || !local) return prev;

            // AI bot logic: shifts at 7200 RPM, accelerates steadily
            if (!bot.isFinished) {
              if (bot.speed < 280) {
                bot.speed += 32 * dt;
                bot.rpm = 2000 + (bot.speed % 60) * 100;
                if (bot.rpm > 7000 && bot.gear < 5) {
                  bot.gear += 1;
                  bot.rpm = 3000;
                  bot.perfectShifts += 1;
                }
              }
              bot.distance += (bot.speed / 3.6) * dt;
              if (bot.distance >= 400) {
                bot.distance = 400;
                bot.isFinished = true;
                bot.finishTime = Date.now() - (prev.startTime || Date.now());
                if (!prev.winnerId) prev.winnerId = bot.id;
              }
            }

            // Check if both finished
            if (bot.isFinished && local.isFinished) {
              return {
                ...prev,
                phase: 'FINISHED',
              };
            }

            return {
              ...prev,
              racers: { ...prev.racers, [bot.id]: { ...bot } },
            };
          });

          soloLoopRef.current = requestAnimationFrame(loop);
        };

        soloLoopRef.current = requestAnimationFrame(loop);
      }
    }, 1000);
  }, []);

  // Handlers for Paddock
  const handleToggleReady = (ready: boolean) => {
    if (isSoloPractice) {
      setRoom((prev) => {
        if (!prev) return null;
        const updatedPlayers = prev.players.map((p) =>
          p.id === localPlayerId ? { ...p, isReady: ready } : p
        );
        return { ...prev, players: updatedPlayers };
      });
      if (ready) {
        startSoloSimulation();
      }
      return;
    }

    if (!socket) return;
    socket.emit('player:ready', { isReady: ready });
  };

  const handleCustomize = (name?: string, carModel?: string, color?: string) => {
    if (isSoloPractice) {
      setRoom((prev) => {
        if (!prev) return null;
        const updatedPlayers = prev.players.map((p) => {
          if (p.id === localPlayerId) {
            return {
              ...p,
              name: name || p.name,
              carModel: carModel || p.carModel,
              color: color || p.color,
            };
          }
          return p;
        });
        return { ...prev, players: updatedPlayers };
      });
      return;
    }

    if (!socket) return;
    socket.emit('player:customize', { name, carModel, color });
  };

  const handleLeaveRoom = () => {
    if (soloLoopRef.current) cancelAnimationFrame(soloLoopRef.current);
    sound.stopEngine();
    setRoom(null);
    setIsSoloPractice(false);
    if (socket && !isSoloPractice) {
      socket.disconnect();
      socket.connect();
    }
  };

  // Handlers for Race HUD driving inputs
  const handleThrottleChange = useCallback(
    (throttle: boolean) => {
      if (isSoloPractice) {
        // Solo local physics integration
        setRoom((prev) => {
          if (!prev || prev.phase !== 'RACING') return prev;
          const local = prev.racers['player-solo'];
          if (!local || local.isFinished) return prev;

          const car = CAR_PRESETS[prev.players[0]?.carModel || 'apex-gt'];
          const gearIdx = Math.max(0, Math.min(4, local.gear - 1));
          const maxSpeedForGear = car.gearRatios[gearIdx];

          if (throttle) {
            const accel = (car.acceleration / 10) * 85;
            if (local.speed < maxSpeedForGear) {
              local.speed = Math.min(maxSpeedForGear, local.speed + accel * 0.05);
            }
            local.rpm = Math.min(car.maxRpm, 1000 + (local.speed / maxSpeedForGear) * (car.maxRpm - 1000));
          } else {
            local.speed = Math.max(0, local.speed - 20 * 0.05);
            local.rpm = Math.max(1000, local.rpm - 150);
          }

          local.distance += (local.speed / 3.6) * 0.05;
          if (local.speed > local.maxSpeedReached) local.maxSpeedReached = Math.round(local.speed);

          if (local.distance >= 400) {
            local.distance = 400;
            local.isFinished = true;
            local.finishTime = Date.now() - (prev.startTime || Date.now());
            if (!prev.winnerId) prev.winnerId = local.id;
          }

          return {
            ...prev,
            racers: { ...prev.racers, [local.id]: { ...local } },
          };
        });
        return;
      }

      if (!socket) return;
      socket.emit('player:input', { throttle });
    },
    [isSoloPractice, socket]
  );

  const handleNitroChange = useCallback(
    (nitro: boolean) => {
      if (isSoloPractice) {
        setRoom((prev) => {
          if (!prev || prev.phase !== 'RACING') return prev;
          const local = prev.racers['player-solo'];
          if (!local || local.isFinished || local.nitro <= 0) return prev;

          local.nitroActive = nitro;
          if (nitro) {
            local.nitro = Math.max(0, local.nitro - 2);
            local.speed = Math.min(310, local.speed + 15 * 0.05);
          }
          return {
            ...prev,
            racers: { ...prev.racers, [local.id]: { ...local } },
          };
        });
        return;
      }

      if (!socket) return;
      socket.emit('player:input', { nitro });
    },
    [isSoloPractice, socket]
  );

  const handleShift = useCallback(
    (direction: 'UP' | 'DOWN') => {
      if (isSoloPractice) {
        setRoom((prev) => {
          if (!prev || prev.phase !== 'RACING') return prev;
          const local = prev.racers['player-solo'];
          const player = prev.players[0];
          if (!local || !player || local.isFinished) return prev;

          const car = CAR_PRESETS[player.carModel] || CAR_PRESETS['apex-gt'];

          if (direction === 'UP' && local.gear < 5) {
            local.totalShifts += 1;
            const diff = Math.abs(local.rpm - car.optimalShiftRpm);
            const isPerfect = diff <= 300;
            if (isPerfect) {
              local.perfectShifts += 1;
              local.speed = Math.min(car.topSpeed, local.speed + 15);
            }
            local.gear += 1;
            local.rpm = Math.max(2200, local.rpm * 0.68);
            local.lastShiftFeedback = {
              quality: isPerfect ? 'PERFECT' : diff > 1000 ? 'EARLY' : 'GOOD',
              timestamp: Date.now(),
            };
            sound.playShiftPop(isPerfect);
          } else if (direction === 'DOWN' && local.gear > 1) {
            local.gear -= 1;
            local.rpm = Math.min(car.maxRpm, local.rpm * 1.3);
            sound.playShiftPop(false);
          }

          return {
            ...prev,
            racers: { ...prev.racers, [local.id]: { ...local } },
          };
        });
        return;
      }

      if (!socket) return;
      socket.emit('player:shift', { direction });
    },
    [isSoloPractice, socket]
  );

  const handleRematch = () => {
    if (isSoloPractice) {
      if (soloLoopRef.current) cancelAnimationFrame(soloLoopRef.current);
      setRoom((prev) => {
        if (!prev) return null;
        const resetRacers: Record<string, RacerTelemetry> = {};
        for (const p of prev.players) {
          resetRacers[p.id] = {
            id: p.id,
            distance: 0,
            speed: 0,
            gear: 1,
            rpm: 1000,
            nitro: 100,
            nitroActive: false,
            isFinished: false,
            finishTime: null,
            perfectShifts: 0,
            totalShifts: 0,
            maxSpeedReached: 0,
            falseStart: false,
          };
        }
        return {
          ...prev,
          phase: 'LOBBY',
          countdown: 3,
          winnerId: null,
          startTime: null,
          racers: resetRacers,
          players: prev.players.map((p) => ({ ...p, isReady: false })),
        };
      });
      return;
    }

    if (!socket) return;
    socket.emit('room:rematch');
  };

  const localPlayer = room?.players.find((p) => p.id === localPlayerId) || null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Global Error Banner */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-950/90 border border-red-500/80 text-red-200 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-3">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Screen 1: Lobby / Room Creation / Join Form */}
      {!room && (
        <LobbyView
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onSoloPractice={handleSoloPractice}
          initialCode={initialJoinCode}
        />
      )}

      {/* Screen 2: Paddock Waiting Screen */}
      {room && room.phase === 'LOBBY' && (
        <PaddockView
          roomCode={room.code}
          players={room.players}
          localPlayer={localPlayer}
          onToggleReady={handleToggleReady}
          onCustomize={handleCustomize}
          onLeave={handleLeaveRoom}
          isSolo={isSoloPractice}
        />
      )}

      {/* Screen 3 & 4: Active Racing / Starting Countdown / Finish Grid */}
      {room && (room.phase === 'COUNTDOWN' || room.phase === 'RACING' || room.phase === 'FINISHED') && (
        <div className="relative w-full h-full">
          {/* Isometric Canvas Game World */}
          <IsometricCanvas
            players={room.players}
            racers={room.racers}
            localPlayerId={localPlayerId}
            trackLength={room.trackLength}
            countdown={room.countdown}
            phase={room.phase}
          />

          {/* Interactive Drag Shifter HUD */}
          <RaceHud
            localPlayer={localPlayer}
            players={room.players}
            racers={room.racers}
            trackLength={room.trackLength}
            countdown={room.countdown}
            phase={room.phase}
            onThrottleChange={handleThrottleChange}
            onNitroChange={handleNitroChange}
            onShift={handleShift}
            onLeaveRace={handleLeaveRoom}
          />

          {/* Victory Podium Modal */}
          {room.phase === 'FINISHED' && (
            <PodiumModal
              players={room.players}
              racers={room.racers}
              winnerId={room.winnerId}
              localPlayerId={localPlayerId}
              onRematch={handleRematch}
              onReturnToPaddock={handleRematch}
            />
          )}
        </div>
      )}
    </div>
  );
}
