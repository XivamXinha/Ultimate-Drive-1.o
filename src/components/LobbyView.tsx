import React, { useState } from 'react';
import { CAR_PRESETS, COLOR_OPTIONS } from '../types/game';
import { Flag, Play, Users, Copy, Check, Sparkles } from 'lucide-react';

interface LobbyViewProps {
  onCreateRoom: (name: string, carModel: string, color: string) => void;
  onJoinRoom: (code: string, name: string, carModel: string, color: string) => void;
  onSoloPractice: (name: string, carModel: string, color: string) => void;
  initialCode?: string;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  onCreateRoom,
  onJoinRoom,
  onSoloPractice,
  initialCode = '',
}) => {
  const [name, setName] = useState('Speedster');
  const [selectedCar, setSelectedCar] = useState('apex-gt');
  const [selectedColor, setSelectedColor] = useState('#EF4444');
  const [joinCode, setJoinCode] = useState(initialCode);
  const [mode, setMode] = useState<'SELECT' | 'JOIN'>('SELECT');
  const [copied, setCopied] = useState(false);

  const carList = Object.values(CAR_PRESETS);
  const activeCar = CAR_PRESETS[selectedCar] || carList[0];

  const handleCreate = () => {
    onCreateRoom(name, selectedCar, selectedColor);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim().length >= 4) {
      onJoinRoom(joinCode.trim().toUpperCase(), name, selectedCar, selectedColor);
    }
  };

  const handleSolo = () => {
    onSoloPractice(name, selectedCar, selectedColor);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Navbar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between gap-8 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center font-black text-slate-950 shadow-lg shadow-red-500/20">
            ⚡
          </div>
          <span className="text-xl font-black tracking-tight font-sans text-white">
            VELOCITY DUEL
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
          <span>Real-Time 2-Player</span>
          <span aria-hidden="true">·</span>
          <span>Socket.io Synchronized</span>
          <span aria-hidden="true">·</span>
          <span className="text-cyan-400">60 FPS Drag Sprint</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-5xl mx-auto my-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Garage & Customization */}
        <section className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>Racer Garage & Livery</span>
          </h2>

          {/* Name Input */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Driver Name
            </label>
            <input
              type="text"
              maxLength={14}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400 transition-colors"
              placeholder="Enter your racing callsign..."
            />
          </div>

          {/* Car Model Selector Cards */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Select Chassis & Engine
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {carList.map((car) => {
                const isSelected = car.id === selectedCar;
                return (
                  <button
                    key={car.id}
                    type="button"
                    onClick={() => setSelectedCar(car.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-400 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {car.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                      {car.tagline}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-300">
                      <span>{car.topSpeed} KM/H</span>
                      <span className="text-cyan-400">ACCEL {car.acceleration}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Livery Palette */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Custom Paint Color
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {COLOR_OPTIONS.map((c) => {
                const isSelected = selectedColor === c.hex;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.hex)}
                    className={`w-9 h-9 rounded-xl transition-transform flex items-center justify-center border-2 ${
                      isSelected ? 'scale-110 border-white shadow-lg' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  >
                    {isSelected && <Check className="w-4 h-4 text-slate-950 font-bold" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Isometric Vehicle Live Spec Preview */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Selected Spec: <strong className="text-white">{activeCar.name}</strong></span>
            <div className="flex items-center gap-4 font-mono">
              <span>REDLINE: {activeCar.maxRpm} RPM</span>
              <span className="text-emerald-400">SWEET-SPOT: {activeCar.optimalShiftRpm} RPM</span>
            </div>
          </div>
        </section>

        {/* Right: Matchmaking & Board Creation */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          {/* Main Action Box */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            {mode === 'SELECT' ? (
              <div className="flex flex-col gap-4">
                <div className="mb-2">
                  <h3 className="text-lg font-bold text-white mb-1">Race Matchmaking</h3>
                  <p className="text-xs text-slate-400">
                    Host a board, get a 6-character room code, and send it to your friend to duel.
                  </p>
                </div>

                {/* Host Race Button */}
                <button
                  onClick={handleCreate}
                  className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-red-600 via-amber-500 to-yellow-500 hover:brightness-110 active:scale-98 text-slate-950 shadow-xl shadow-red-500/20 flex items-center justify-center gap-2.5 transition-all text-sm uppercase tracking-wide cursor-pointer"
                >
                  <Flag className="w-5 h-5 fill-slate-950" />
                  <span>Create Board & Get Code</span>
                </button>

                {/* Join with Code Button */}
                <button
                  onClick={() => setMode('JOIN')}
                  className="w-full py-3.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 active:scale-98 text-white border border-slate-700 flex items-center justify-center gap-2.5 transition-all text-xs uppercase tracking-wider cursor-pointer"
                >
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Join with Friend's Code</span>
                </button>

                {/* Practice Mode */}
                <button
                  onClick={handleSolo}
                  className="w-full py-3 rounded-xl font-semibold bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center gap-2 transition-all text-xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Solo Practice Test Run</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleJoin} className="flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Enter Room Code</h3>
                  <p className="text-xs text-slate-400">
                    Type the 6-character room code given by your friend.
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. NEON99"
                    className="w-full bg-slate-950 border border-cyan-500/60 rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest text-cyan-300 focus:outline-none focus:border-cyan-400 uppercase"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={joinCode.trim().length < 4}
                    className="flex-1 py-3 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 transition-all text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Join Race Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('SELECT')}
                    className="px-4 py-3 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Quick Rules & Drag Shifting Guide */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
            <span className="font-bold text-slate-200 block text-[11px] uppercase tracking-wider">
              Drag Sprint Controls & Rules:
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <strong className="text-slate-200 block">Gas Pedal:</strong>
                <span className="font-mono text-slate-400">[W] or [↑]</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <strong className="text-slate-200 block">Shift Up:</strong>
                <span className="font-mono text-slate-400">[SPACE] or [E]</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <strong className="text-slate-200 block">Shift Down:</strong>
                <span className="font-mono text-slate-400">[S] or [Q]</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <strong className="text-slate-200 block">Nitro Boost:</strong>
                <span className="font-mono text-slate-400">[SHIFT] or [N]</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic pt-1">
              Tip: Shift when the RPM bar enters the green sweet spot for maximum launch boost!
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto py-3 border-t border-slate-800/80 text-center text-xs text-slate-500">
        Velocity Duel · Real-time 2-Player Isometric Web Drag Racer
      </footer>
    </div>
  );
};
