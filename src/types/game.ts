export type GamePhase = 'LOBBY' | 'PADDOCK' | 'COUNTDOWN' | 'RACING' | 'FINISHED';

export type ShiftQuality = 'PERFECT' | 'GOOD' | 'EARLY' | 'OVERREV';

export interface CarStats {
  id: string;
  name: string;
  tagline: string;
  topSpeed: number; // km/h
  acceleration: number; // 1-10
  nitroPower: number; // 1-10
  gearRatios: number[]; // gear speed limits
  optimalShiftRpm: number;
  maxRpm: number;
}

export interface PlayerInfo {
  id: string;
  name: string;
  carModel: string;
  color: string;
  lane: 0 | 1;
  isReady: boolean;
  isHost: boolean;
}

export interface RacerTelemetry {
  id: string;
  distance: number; // 0 to 400 meters
  speed: number; // km/h
  gear: number; // 1 to 5
  rpm: number; // 1000 to maxRpm
  nitro: number; // 0 to 100%
  nitroActive: boolean;
  isFinished: boolean;
  finishTime: number | null; // milliseconds
  perfectShifts: number;
  totalShifts: number;
  maxSpeedReached: number;
  falseStart: boolean;
  lastShiftFeedback?: {
    quality: ShiftQuality;
    timestamp: number;
  };
}

export interface RoomState {
  code: string;
  phase: GamePhase;
  players: PlayerInfo[];
  countdown: number; // 3, 2, 1, 0
  trackLength: number; // 400m
  racers: Record<string, RacerTelemetry>;
  winnerId: string | null;
  startTime: number | null;
}

export const CAR_PRESETS: Record<string, CarStats> = {
  'apex-gt': {
    id: 'apex-gt',
    name: 'Apex GT V8',
    tagline: 'Raw American V8 Muscle. Heavy launch torque.',
    topSpeed: 285,
    acceleration: 8.8,
    nitroPower: 8.5,
    gearRatios: [60, 110, 170, 230, 285],
    optimalShiftRpm: 6800,
    maxRpm: 8000,
  },
  'turbo-phantom': {
    id: 'turbo-phantom',
    name: 'Phantom R-Turbo',
    tagline: 'High-revving JDM twin-turbo with razor shifting.',
    topSpeed: 295,
    acceleration: 8.4,
    nitroPower: 9.2,
    gearRatios: [55, 105, 165, 225, 295],
    optimalShiftRpm: 7500,
    maxRpm: 9000,
  },
  'crimson-vector': {
    id: 'crimson-vector',
    name: 'Vector EV-Sprint',
    tagline: 'Instant dual-motor torque and sustained boost.',
    topSpeed: 275,
    acceleration: 9.6,
    nitroPower: 7.8,
    gearRatios: [70, 130, 190, 240, 275],
    optimalShiftRpm: 6500,
    maxRpm: 7500,
  },
};

export const COLOR_OPTIONS = [
  { id: 'crimson', label: 'Hot Rod Red', hex: '#EF4444', secondary: '#991B1B' },
  { id: 'cyan', label: 'Cyber Teal', hex: '#06B6D4', secondary: '#0E7490' },
  { id: 'amber', label: 'Solar Amber', hex: '#F59E0B', secondary: '#B45309' },
  { id: 'purple', label: 'Midnight Violet', hex: '#8B5CF6', secondary: '#5B21B6' },
  { id: 'emerald', label: 'Acid Green', hex: '#10B981', secondary: '#047857' },
  { id: 'white', label: 'Alpine Frost', hex: '#F8FAFC', secondary: '#64748B' },
];
