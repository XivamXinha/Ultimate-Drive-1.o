import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { CAR_PRESETS, CarStats, GamePhase, PlayerInfo, RacerTelemetry, RoomState, ShiftQuality } from './src/types/game';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const PORT = Number(process.env.PORT) || 3000;
const TRACK_LENGTH = 400; // 400 meters (1/4 mile sprint)

interface ServerRoom {
  code: string;
  phase: GamePhase;
  players: PlayerInfo[];
  countdown: number;
  countdownTimer: NodeJS.Timeout | null;
  trackLength: number;
  racers: Record<string, RacerTelemetry>;
  winnerId: string | null;
  startTime: number | null;
  gameLoopInterval: NodeJS.Timeout | null;
  inputs: Record<string, { throttle: boolean; gear: number; nitro: boolean }>;
}

const rooms = new Map<string, ServerRoom>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function initializeRacer(playerId: string): RacerTelemetry {
  return {
    id: playerId,
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

function createRoom(hostPlayer: PlayerInfo): ServerRoom {
  const code = generateRoomCode();
  const room: ServerRoom = {
    code,
    phase: 'LOBBY',
    players: [hostPlayer],
    countdown: 3,
    countdownTimer: null,
    trackLength: TRACK_LENGTH,
    racers: {
      [hostPlayer.id]: initializeRacer(hostPlayer.id),
    },
    winnerId: null,
    startTime: null,
    gameLoopInterval: null,
    inputs: {
      [hostPlayer.id]: { throttle: false, gear: 1, nitro: false },
    },
  };
  rooms.set(code, room);
  return room;
}

function stopRoomTimers(room: ServerRoom) {
  if (room.countdownTimer) {
    clearInterval(room.countdownTimer);
    room.countdownTimer = null;
  }
  if (room.gameLoopInterval) {
    clearInterval(room.gameLoopInterval);
    room.gameLoopInterval = null;
  }
}

function startCountdown(room: ServerRoom) {
  stopRoomTimers(room);
  room.phase = 'COUNTDOWN';
  room.countdown = 3;
  room.winnerId = null;
  room.startTime = null;

  // Reset racers telemetry
  for (const player of room.players) {
    room.racers[player.id] = initializeRacer(player.id);
    room.inputs[player.id] = { throttle: false, gear: 1, nitro: false };
  }

  io.to(room.code).emit('room:update', getPublicRoomState(room));
  io.to(room.code).emit('race:countdown', { count: room.countdown });

  room.countdownTimer = setInterval(() => {
    room.countdown -= 1;
    if (room.countdown > 0) {
      io.to(room.code).emit('race:countdown', { count: room.countdown });
    } else if (room.countdown === 0) {
      // Race starts now!
      io.to(room.code).emit('race:countdown', { count: 0 });
      room.phase = 'RACING';
      room.startTime = Date.now();
      io.to(room.code).emit('room:update', getPublicRoomState(room));
      clearInterval(room.countdownTimer!);
      room.countdownTimer = null;
      startGameLoop(room);
    }
  }, 1000);
}

function startGameLoop(room: ServerRoom) {
  if (room.gameLoopInterval) clearInterval(room.gameLoopInterval);

  const TICK_RATE = 60;
  const dt = 1 / TICK_RATE;

  room.gameLoopInterval = setInterval(() => {
    if (room.phase !== 'RACING') {
      clearInterval(room.gameLoopInterval!);
      room.gameLoopInterval = null;
      return;
    }

    const now = Date.now();
    let allFinished = true;

    for (const player of room.players) {
      const racer = room.racers[player.id];
      if (!racer) continue;

      if (racer.isFinished) {
        continue;
      }
      allFinished = false;

      const input = room.inputs[player.id] || { throttle: false, gear: 1, nitro: false };
      const carStats: CarStats = CAR_PRESETS[player.carModel] || CAR_PRESETS['apex-gt'];

      const gearIdx = Math.max(0, Math.min(4, racer.gear - 1));
      const maxSpeedForGear = carStats.gearRatios[gearIdx];

      // Nitro handling
      let nitroMultiplier = 1;
      if (input.nitro && racer.nitro > 0) {
        racer.nitro = Math.max(0, racer.nitro - 25 * dt);
        racer.nitroActive = true;
        nitroMultiplier = 1 + (carStats.nitroPower / 10) * 0.45;
      } else {
        racer.nitroActive = false;
      }

      // Acceleration and speed physics
      if (input.throttle) {
        // Calculate torque curve based on RPM
        const rpmRatio = racer.rpm / carStats.maxRpm;
        const torqueFactor = Math.sin(rpmRatio * Math.PI * 0.95); // Peak torque in mid-high RPM
        const baseAccel = (carStats.acceleration / 10) * 45; // m/s^2 equivalent factor
        const accel = baseAccel * Math.max(0.4, torqueFactor) * nitroMultiplier;

        // Apply acceleration up to gear's max speed (with nitro allowing slight overrun)
        const effectiveMaxSpeed = maxSpeedForGear * (racer.nitroActive ? 1.15 : 1.0);
        if (racer.speed < effectiveMaxSpeed) {
          racer.speed = Math.min(effectiveMaxSpeed, racer.speed + accel * dt * 3.6);
        } else {
          // Engine braking if exceeding gear max
          racer.speed = Math.max(effectiveMaxSpeed, racer.speed - 30 * dt * 3.6);
        }

        // RPM calculation based on speed within current gear
        const prevGearMax = gearIdx > 0 ? carStats.gearRatios[gearIdx - 1] : 0;
        const gearSpeedSpan = Math.max(20, maxSpeedForGear - prevGearMax);
        const speedInGear = Math.max(0, racer.speed - prevGearMax);
        const calculatedRpm = 1000 + (speedInGear / gearSpeedSpan) * (carStats.maxRpm - 1000);
        racer.rpm = Math.min(carStats.maxRpm, Math.max(1000, calculatedRpm));
      } else {
        // Coasting deceleration
        racer.speed = Math.max(0, racer.speed - 25 * dt * 3.6);
        racer.rpm = Math.max(1000, racer.rpm - 3500 * dt);
      }

      // Track max speed
      if (racer.speed > racer.maxSpeedReached) {
        racer.maxSpeedReached = Math.round(racer.speed);
      }

      // Distance update: speed is in km/h -> convert to m/s: km/h / 3.6
      const speedMs = racer.speed / 3.6;
      racer.distance += speedMs * dt;

      // Check finish line
      if (racer.distance >= room.trackLength) {
        racer.distance = room.trackLength;
        racer.isFinished = true;
        racer.finishTime = room.startTime ? now - room.startTime : 0;

        if (!room.winnerId) {
          room.winnerId = racer.id;
        }
      }
    }

    // Broadcast 60Hz tick
    io.to(room.code).emit('race:tick', {
      racers: room.racers,
    });

    if (allFinished) {
      finishRace(room);
    }
  }, 1000 / TICK_RATE);
}

function finishRace(room: ServerRoom) {
  stopRoomTimers(room);
  room.phase = 'FINISHED';

  // Mark all unready so players can choose to rematch
  for (const player of room.players) {
    player.isReady = false;
  }

  io.to(room.code).emit('room:update', getPublicRoomState(room));
  io.to(room.code).emit('race:finish', {
    winnerId: room.winnerId,
    racers: room.racers,
  });
}

function getPublicRoomState(room: ServerRoom): RoomState {
  return {
    code: room.code,
    phase: room.phase,
    players: room.players,
    countdown: room.countdown,
    trackLength: room.trackLength,
    racers: room.racers,
    winnerId: room.winnerId,
    startTime: room.startTime,
  };
}

io.on('connection', (socket: Socket) => {
  let currentRoomCode: string | null = null;

  socket.on('room:create', (data: { name: string; carModel: string; color: string }) => {
    const hostPlayer: PlayerInfo = {
      id: socket.id,
      name: data.name || 'Racer 1',
      carModel: data.carModel || 'apex-gt',
      color: data.color || '#EF4444',
      lane: 0,
      isReady: false,
      isHost: true,
    };

    const room = createRoom(hostPlayer);
    currentRoomCode = room.code;
    socket.join(room.code);

    socket.emit('room:joined', {
      room: getPublicRoomState(room),
      playerId: socket.id,
    });
  });

  socket.on('room:join', (data: { roomCode: string; name: string; carModel: string; color: string }) => {
    const code = (data.roomCode || '').trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      socket.emit('room:error', { message: 'Race room code not found. Check the code and try again.' });
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('room:error', { message: 'This race room is already full (2 racers maximum).' });
      return;
    }

    if (room.phase === 'RACING' || room.phase === 'COUNTDOWN') {
      socket.emit('room:error', { message: 'A race is currently in progress in this room.' });
      return;
    }

    const challenger: PlayerInfo = {
      id: socket.id,
      name: data.name || 'Racer 2',
      carModel: data.carModel || 'turbo-phantom',
      color: data.color || '#06B6D4',
      lane: 1,
      isReady: false,
      isHost: false,
    };

    room.players.push(challenger);
    room.racers[challenger.id] = initializeRacer(challenger.id);
    room.inputs[challenger.id] = { throttle: false, gear: 1, nitro: false };

    currentRoomCode = room.code;
    socket.join(room.code);

    socket.emit('room:joined', {
      room: getPublicRoomState(room),
      playerId: socket.id,
    });

    io.to(room.code).emit('room:update', getPublicRoomState(room));
  });

  socket.on('player:customize', (data: { name?: string; carModel?: string; color?: string }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.phase === 'RACING') return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    if (data.name) player.name = data.name.slice(0, 16);
    if (data.carModel && CAR_PRESETS[data.carModel]) player.carModel = data.carModel;
    if (data.color) player.color = data.color;

    io.to(room.code).emit('room:update', getPublicRoomState(room));
  });

  socket.on('player:ready', (data: { isReady: boolean }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.phase === 'RACING' || room.phase === 'COUNTDOWN') return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    player.isReady = Boolean(data.isReady);
    io.to(room.code).emit('room:update', getPublicRoomState(room));

    // If 2 players and both ready, start the race countdown!
    if (room.players.length === 2 && room.players.every((p) => p.isReady)) {
      startCountdown(room);
    }
  });

  socket.on('player:input', (data: { throttle?: boolean; nitro?: boolean }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const currentInput = room.inputs[socket.id];
    if (!currentInput) return;

    // Check false start during countdown
    if (room.phase === 'COUNTDOWN' && data.throttle) {
      const racer = room.racers[socket.id];
      if (racer && !racer.falseStart) {
        racer.falseStart = true;
        io.to(room.code).emit('race:falsestart', { playerId: socket.id });
      }
    }

    if (data.throttle !== undefined) currentInput.throttle = Boolean(data.throttle);
    if (data.nitro !== undefined) currentInput.nitro = Boolean(data.nitro);
  });

  socket.on('player:shift', (data: { direction: 'UP' | 'DOWN' }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.phase !== 'RACING') return;

    const racer = room.racers[socket.id];
    const player = room.players.find((p) => p.id === socket.id);
    if (!racer || !player || racer.isFinished) return;

    const carStats = CAR_PRESETS[player.carModel] || CAR_PRESETS['apex-gt'];

    if (data.direction === 'UP' && racer.gear < 5) {
      racer.totalShifts += 1;
      const rpm = racer.rpm;
      const optimal = carStats.optimalShiftRpm;
      const diff = Math.abs(rpm - optimal);

      let quality: ShiftQuality = 'GOOD';
      if (diff <= 250) {
        quality = 'PERFECT';
        racer.perfectShifts += 1;
        // Perfect shift speed kick!
        racer.speed = Math.min(carStats.topSpeed, racer.speed + 12);
      } else if (rpm < optimal - 1200) {
        quality = 'EARLY';
      } else if (rpm >= carStats.maxRpm - 200) {
        quality = 'OVERREV';
      }

      racer.gear += 1;
      // RPM drops on upshift
      racer.rpm = Math.max(2200, racer.rpm * 0.68);
      racer.lastShiftFeedback = { quality, timestamp: Date.now() };

      socket.emit('player:shiftfeedback', { quality });
      io.to(room.code).emit('race:shift', { playerId: socket.id, gear: racer.gear, quality });
    } else if (data.direction === 'DOWN' && racer.gear > 1) {
      racer.gear -= 1;
      racer.rpm = Math.min(carStats.maxRpm, racer.rpm * 1.35);
      io.to(room.code).emit('race:shift', { playerId: socket.id, gear: racer.gear, quality: 'GOOD' });
    }
  });

  socket.on('room:rematch', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    // Reset room for rematch
    stopRoomTimers(room);
    room.phase = 'LOBBY';
    room.winnerId = null;
    room.startTime = null;
    room.countdown = 3;

    for (const player of room.players) {
      player.isReady = false;
      room.racers[player.id] = initializeRacer(player.id);
      room.inputs[player.id] = { throttle: false, gear: 1, nitro: false };
    }

    io.to(room.code).emit('room:update', getPublicRoomState(room));
  });

  socket.on('disconnect', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.players = room.players.filter((p) => p.id !== socket.id);
        delete room.racers[socket.id];
        delete room.inputs[socket.id];

        if (room.players.length === 0) {
          stopRoomTimers(room);
          rooms.delete(currentRoomCode);
        } else {
          // If the host left, reassign host role to remaining player
          if (room.players[0]) {
            room.players[0].isHost = true;
            room.players[0].lane = 0;
            room.players[0].isReady = false;
          }
          stopRoomTimers(room);
          room.phase = 'LOBBY';
          io.to(room.code).emit('room:update', getPublicRoomState(room));
          io.to(room.code).emit('player:left', { playerId: socket.id });
        }
      }
    }
  });
});

// Configure Vite middleware in development or express.static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Velocity Duel server running on port ${PORT}`);
  });
}

startServer();
