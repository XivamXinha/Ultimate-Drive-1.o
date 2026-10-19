import React, { useEffect, useState } from 'react';
import { CAR_PRESETS, CarStats, PlayerInfo, RacerTelemetry, ShiftQuality } from '../types/game';
import { Volume2, VolumeX, Zap, ArrowUp, ArrowDown, Gauge } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface RaceHudProps {
  localPlayer: PlayerInfo | null;
  players: PlayerInfo[];
  racers: Record<string, RacerTelemetry>;
  trackLength: number;
  countdown: number;
  phase: string;
  onThrottleChange: (throttle: boolean) => void;
  onNitroChange: (nitro: boolean) => void;
  onShift: (direction: 'UP' | 'DOWN') => void;
  onLeaveRace?: () => void;
}

export const RaceHud: React.FC<RaceHudProps> = ({
  localPlayer,
  players,
  racers,
  trackLength,
  countdown,
  phase,
  onThrottleChange,
  onNitroChange,
  onShift,
  onLeaveRace,
}) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [throttleActive, setThrottleActive] = useState(false);
  const [nitroActive, setNitroActive] = useState(false);

  const localTelemetry = localPlayer ? racers[localPlayer.id] : null;
  const carStats: CarStats = localPlayer ? CAR_PRESETS[localPlayer.carModel] || CAR_PRESETS['apex-gt'] : CAR_PRESETS['apex-gt'];

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  // Keyboard driving input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        setThrottleActive(true);
        onThrottleChange(true);
      } else if (e.key === ' ' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        onShift('UP');
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown' || e.key === 'q' || e.key === 'Q') {
        onShift('DOWN');
      } else if (e.key === 'Shift' || e.key === 'n' || e.key === 'N') {
        setNitroActive(true);
        onNitroChange(true);
        sound.playNitroSound();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        setThrottleActive(false);
        onThrottleChange(false);
      } else if (e.key === 'Shift' || e.key === 'n' || e.key === 'N') {
        setNitroActive(false);
        onNitroChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onThrottleChange, onNitroChange, onShift]);

  // Audio engine sound sync
  useEffect(() => {
    if (phase === 'RACING') {
      sound.startEngine();
      if (localTelemetry) {
        sound.updateEngineRpm(localTelemetry.rpm, carStats.maxRpm, throttleActive);
      }
    } else if (phase === 'FINISHED') {
      sound.stopEngine();
    }
  }, [phase, localTelemetry, carStats, throttleActive]);

  // Countdown audio cue
  useEffect(() => {
    if (phase === 'COUNTDOWN') {
      if (countdown > 0) {
        sound.playCountdownBeep(false);
      } else if (countdown === 0) {
        sound.playCountdownBeep(true);
      }
    }
  }, [countdown, phase]);

  const rpm = localTelemetry ? localTelemetry.rpm : 1000;
  const speed = localTelemetry ? Math.round(localTelemetry.speed) : 0;
  const gear = localTelemetry ? localTelemetry.gear : 1;
  const nitro = localTelemetry ? Math.round(localTelemetry.nitro) : 100;
  const maxRpm = carStats.maxRpm;
  const optimalRpm = carStats.optimalShiftRpm;

  const rpmPercent = Math.min(100, Math.max(0, ((rpm - 1000) / (maxRpm - 1000)) * 100));
  const isOptimalWindow = Math.abs(rpm - optimalRpm) <= 300;
  const isRedline = rpm >= maxRpm - 300;

  // Touch handlers
  const handleGasStart = () => {
    setThrottleActive(true);
    onThrottleChange(true);
  };
  const handleGasEnd = () => {
    setThrottleActive(false);
    onThrottleChange(false);
  };

  const handleNitroStart = () => {
    setNitroActive(true);
    onNitroChange(true);
    sound.playNitroSound();
  };
  const handleNitroEnd = () => {
    setNitroActive(false);
    onNitroChange(false);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 z-20">
      {/* Top Header: Track Progress & Controls */}
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-2 pointer-events-auto">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <div className="flex items-center gap-3">
            <span className="font-mono bg-slate-900/80 border border-slate-700/60 px-2.5 py-1 rounded text-cyan-400">
              1/4 MILE SPRINT
            </span>
            <span className="text-slate-400 hidden sm:inline">Track: 400m</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            {onLeaveRace && (
              <button
                onClick={onLeaveRace}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/90 border border-slate-700 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Exit Paddock
              </button>
            )}
          </div>
        </div>

        {/* Dual Lane Progress Bar */}
        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl flex flex-col gap-2">
          {players.map((p, idx) => {
            const telemetry = racers[p.id];
            const dist = telemetry ? telemetry.distance : 0;
            const progress = Math.min(100, (dist / trackLength) * 100);
            const isLocal = p.id === localPlayer?.id;

            return (
              <div key={p.id} className="flex items-center gap-3 text-xs">
                <span className="w-20 font-bold truncate text-slate-200 flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name} {isLocal && <span className="text-cyan-400 font-mono">(YOU)</span>}
                </span>

                <div className="relative flex-1 h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-75"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: p.color,
                      boxShadow: `0 0 10px ${p.color}`,
                    }}
                  />
                </div>

                <span className="font-mono w-16 text-right tabular-nums text-slate-400">
                  {Math.round(dist)}m
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Countdown Big Display */}
      {phase === 'COUNTDOWN' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center animate-bounce">
            <span
              className={`text-7xl sm:text-9xl font-black font-sans tracking-widest drop-shadow-[0_0_35px_rgba(255,255,255,0.6)] ${
                countdown === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {countdown === 0 ? 'GO!' : countdown}
            </span>
            <span className="text-slate-300 font-semibold tracking-wider uppercase text-sm mt-2 bg-slate-900/80 px-4 py-1 rounded-full border border-slate-700">
              {countdown === 0 ? 'LAUNCH THROTTLE!' : 'REV UP & HOLD LAUNCH'}
            </span>
          </div>
        </div>
      )}

      {/* False Start Warning Banner */}
      {localTelemetry?.falseStart && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-red-950/90 border border-red-500/80 text-red-200 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-2">
          <span>⚠️ False Start Penalty: 1.5s delay added</span>
        </div>
      )}

      {/* Shift Feedback Banner */}
      {localTelemetry?.lastShiftFeedback && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 pointer-events-none">
          {renderShiftBadge(localTelemetry.lastShiftFeedback.quality)}
        </div>
      )}

      {/* Bottom Cockpit: Gauges & Interactive Controls */}
      <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-end justify-between gap-4 pointer-events-auto">
        {/* Left: Shifter & Nitro Pedals (Mobile + Desktop Click) */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-center md:justify-start">
          <button
            onPointerDown={() => onShift('DOWN')}
            className="flex-1 md:flex-initial flex flex-col items-center justify-center bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 border border-slate-700 rounded-xl p-3.5 text-slate-200 transition-transform active:scale-95 shadow-lg min-w-[70px]"
            title="Shift Down (Key: S or Q)"
          >
            <ArrowDown className="w-5 h-5 text-slate-400" />
            <span className="text-[10px] font-bold mt-1 text-slate-400">SHIFT DN</span>
            <span className="text-[9px] font-mono text-slate-500">[S / Q]</span>
          </button>

          <button
            onPointerDown={() => onShift('UP')}
            className={`flex-1 md:flex-initial flex flex-col items-center justify-center border rounded-xl p-3.5 transition-all active:scale-95 shadow-lg min-w-[85px] ${
              isOptimalWindow
                ? 'bg-emerald-600/90 border-emerald-400 text-white animate-pulse shadow-emerald-500/30'
                : 'bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title="Shift Up (Key: Space or W)"
          >
            <ArrowUp className={`w-5 h-5 ${isOptimalWindow ? 'text-white' : 'text-emerald-400'}`} />
            <span className="text-[10px] font-bold mt-1">SHIFT UP</span>
            <span className="text-[9px] font-mono opacity-80">[SPACE]</span>
          </button>

          <button
            onPointerDown={handleNitroStart}
            onPointerUp={handleNitroEnd}
            onPointerLeave={handleNitroEnd}
            disabled={nitro <= 0}
            className={`flex-1 md:flex-initial flex flex-col items-center justify-center border rounded-xl p-3.5 transition-all active:scale-95 shadow-lg min-w-[85px] ${
              nitroActive && nitro > 0
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-cyan-500/50 scale-105'
                : nitro > 0
                ? 'bg-slate-900/90 hover:bg-slate-800 border-cyan-600/60 text-cyan-300'
                : 'bg-slate-950/50 border-slate-800 text-slate-600 cursor-not-allowed'
            }`}
            title="Nitro Boost (Key: Shift or N)"
          >
            <Zap className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">NITRO ({nitro}%)</span>
            <span className="text-[9px] font-mono opacity-80">[SHIFT]</span>
          </button>
        </div>

        {/* Center: Main Dashboard Gauge & Tachometer */}
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl flex items-center justify-around gap-6 w-full md:w-auto">
          {/* Gear Indicator */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gear</span>
            <span className="text-4xl sm:text-5xl font-black font-sans text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
              {gear}
            </span>
            <span className="text-[9px] font-mono text-slate-500">MAX 5</span>
          </div>

          {/* Tachometer Bar + Speed */}
          <div className="flex flex-col items-center gap-1.5 w-44 sm:w-56">
            <div className="flex items-center justify-between w-full text-xs font-mono font-bold">
              <span className="text-slate-400">{Math.round(rpm)} RPM</span>
              <span className={isRedline ? 'text-red-400 animate-ping' : isOptimalWindow ? 'text-emerald-400' : 'text-slate-500'}>
                {isRedline ? 'REDLINE!' : isOptimalWindow ? 'SHIFT NOW!' : ''}
              </span>
            </div>

            {/* RPM Progress Bar with Sweet-Spot Window */}
            <div className="relative w-full h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-700/80">
              {/* Sweet spot indicator */}
              <div
                className="absolute top-0 bottom-0 bg-emerald-500/30 border-l border-r border-emerald-400"
                style={{
                  left: `${((optimalRpm - 300 - 1000) / (maxRpm - 1000)) * 100}%`,
                  width: `${(600 / (maxRpm - 1000)) * 100}%`,
                }}
              />
              {/* Redline zone */}
              <div
                className="absolute top-0 bottom-0 right-0 bg-red-600/40"
                style={{ width: `${(400 / (maxRpm - 1000)) * 100}%` }}
              />

              {/* Active RPM Fill */}
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  isRedline ? 'bg-red-500' : isOptimalWindow ? 'bg-emerald-400' : 'bg-cyan-500'
                }`}
                style={{
                  width: `${rpmPercent}%`,
                  boxShadow: isOptimalWindow ? '0 0 12px #10B981' : isRedline ? '0 0 12px #EF4444' : 'none',
                }}
              />
            </div>

            {/* Speed Display */}
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl sm:text-4xl font-black font-sans text-slate-100 tabular-nums">
                {speed}
              </span>
              <span className="text-xs font-bold text-slate-400 font-mono">KM/H</span>
            </div>
          </div>

          {/* Nitro Tank Level Bar */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">NOS</span>
            <div className="w-3.5 h-16 bg-slate-900 rounded-full overflow-hidden border border-slate-700 flex flex-col justify-end p-0.5">
              <div
                className="w-full bg-cyan-400 rounded-full transition-all duration-100"
                style={{ height: `${nitro}%`, boxShadow: '0 0 8px #06B6D4' }}
              />
            </div>
            <span className="text-[9px] font-mono text-slate-400">{nitro}%</span>
          </div>
        </div>

        {/* Right: Big Gas Pedal (Mobile & Touch) */}
        <div className="w-full md:w-auto flex justify-center md:justify-end">
          <button
            onPointerDown={handleGasStart}
            onPointerUp={handleGasEnd}
            onPointerLeave={handleGasEnd}
            className={`w-full md:w-32 h-20 md:h-24 rounded-2xl flex flex-col items-center justify-center font-bold transition-all active:scale-95 shadow-2xl border ${
              throttleActive
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-emerald-500/40 scale-102'
                : 'bg-slate-900/95 hover:bg-slate-800 text-slate-200 border-slate-700'
            }`}
            title="Accelerate / Gas Pedal (Hold W or Up Arrow)"
          >
            <Gauge className="w-6 h-6 mb-1" />
            <span className="text-sm font-sans tracking-wide">THROTTLE</span>
            <span className="text-[10px] font-mono opacity-80">[HOLD W / ↑]</span>
          </button>
        </div>
      </div>
    </div>
  );
};

function renderShiftBadge(quality: ShiftQuality) {
  switch (quality) {
    case 'PERFECT':
      return (
        <div className="bg-emerald-500 text-slate-950 font-black px-4 py-1.5 rounded-full text-sm uppercase tracking-wider shadow-[0_0_20px_#10B981] animate-bounce">
          ⚡ PERFECT SHIFT! (+12 KM/H)
        </div>
      );
    case 'GOOD':
      return (
        <div className="bg-cyan-500 text-slate-950 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wide">
          ✓ GOOD SHIFT
        </div>
      );
    case 'EARLY':
      return (
        <div className="bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wide">
          ⚠️ EARLY SHIFT (LOW TORQUE)
        </div>
      );
    case 'OVERREV':
      return (
        <div className="bg-red-500 text-white font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wide">
          ✕ OVER-REV (BOUNCING REDLINE)
        </div>
      );
  }
}
