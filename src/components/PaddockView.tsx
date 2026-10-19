import React, { useState } from 'react';
import { CAR_PRESETS, COLOR_OPTIONS, PlayerInfo } from '../types/game';
import { Copy, Check, Share2, ArrowLeft, Flag, CheckCircle2, Clock } from 'lucide-react';

interface PaddockViewProps {
  roomCode: string;
  players: PlayerInfo[];
  localPlayer: PlayerInfo | null;
  onToggleReady: (ready: boolean) => void;
  onCustomize: (name?: string, carModel?: string, color?: string) => void;
  onLeave: () => void;
  isSolo?: boolean;
}

export const PaddockView: React.FC<PaddockViewProps> = ({
  roomCode,
  players,
  localPlayer,
  onToggleReady,
  onCustomize,
  onLeave,
  isSolo = false,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isLocalReady = localPlayer?.isReady || false;
  const bothReady = players.length >= 2 && players.every((p) => p.isReady);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?join=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const p1 = players[0];
  const p2 = players[1];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between gap-4 py-3 border-b border-slate-800">
        <button
          onClick={onLeave}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Menu</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold text-slate-400">Match Paddock</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-4xl mx-auto my-6 flex flex-col items-center gap-6">
        {/* Room Code Card */}
        <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center shadow-xl backdrop-blur-sm flex flex-col items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Race Board Code
          </span>
          <div className="flex items-center justify-center gap-3 my-2">
            <span className="font-mono text-4xl sm:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500">
              {roomCode}
            </span>
          </div>

          <p className="text-xs text-slate-400 max-w-md mb-4">
            Share this 6-character code or the direct invite link with your friend to line up on the grid.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleCopyCode}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
              <span>{copiedCode ? 'Code Copied!' : 'Copy Room Code'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-amber-400" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Direct Invite Link'}</span>
            </button>
          </div>
        </div>

        {/* Dual Racer Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slot 1: Host */}
          {p1 && (
            <RacerSlotCard
              player={p1}
              isLocal={p1.id === localPlayer?.id}
              slotTitle="LANE 1 (NORTH)"
              onCustomizeColor={(color) => onCustomize(undefined, undefined, color)}
              onCustomizeCar={(carModel) => onCustomize(undefined, carModel, undefined)}
            />
          )}

          {/* Slot 2: Challenger */}
          {p2 ? (
            <RacerSlotCard
              player={p2}
              isLocal={p2.id === localPlayer?.id}
              slotTitle="LANE 2 (SOUTH)"
              onCustomizeColor={(color) => onCustomize(undefined, undefined, color)}
              onCustomizeCar={(carModel) => onCustomize(undefined, carModel, undefined)}
            />
          ) : (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[260px]">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3 animate-pulse">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-200 mb-1">Waiting for Challenger...</h4>
              <p className="text-xs text-slate-400 max-w-xs mb-3">
                Send the room code <strong className="text-amber-400 font-mono">{roomCode}</strong> to your friend so they can join lane 2.
              </p>
              {isSolo && (
                <span className="text-[11px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-3 py-1 rounded-full">
                  Solo Practice Run Mode
                </span>
              )}
            </div>
          )}
        </div>

        {/* Ready Action Footer */}
        <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="text-center sm:text-left">
            <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
              Grid Status
            </span>
            <p className="text-sm font-semibold text-slate-200">
              {bothReady
                ? '🟢 Both racers locked in! Starting countdown...'
                : players.length === 1
                ? 'Waiting for Player 2 to enter the paddock'
                : isLocalReady
                ? 'You are ready! Waiting for opponent...'
                : 'Configure your racer and hit Ready when prepared'}
            </p>
          </div>

          <button
            onClick={() => onToggleReady(!isLocalReady)}
            className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold uppercase tracking-wider text-sm transition-all shadow-xl cursor-pointer ${
              isLocalReady
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-red-600 to-amber-500 hover:brightness-110 text-slate-950 shadow-red-500/20'
            }`}
          >
            {isLocalReady ? '✓ READY (CLICK TO UNREADY)' : '⚡ READY UP'}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto py-3 border-t border-slate-800/80 text-center text-xs text-slate-500">
        Sprint distance: 400m · Shifts: 5-speed manual · Ready up to trigger starting tree
      </footer>
    </div>
  );
};

interface RacerSlotCardProps {
  player: PlayerInfo;
  isLocal: boolean;
  slotTitle: string;
  onCustomizeColor: (color: string) => void;
  onCustomizeCar: (model: string) => void;
}

const RacerSlotCard: React.FC<RacerSlotCardProps> = ({
  player,
  isLocal,
  slotTitle,
  onCustomizeColor,
  onCustomizeCar,
}) => {
  const car = CAR_PRESETS[player.carModel] || CAR_PRESETS['apex-gt'];

  return (
    <div
      className={`relative bg-slate-900/80 border rounded-2xl p-5 shadow-xl transition-all ${
        player.isReady
          ? 'border-emerald-500/80 shadow-emerald-500/10'
          : 'border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-3">
        <span>{slotTitle}</span>
        {player.isReady ? (
          <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full text-[10px]">
            <CheckCircle2 className="w-3 h-3" />
            LOCKED & READY
          </span>
        ) : (
          <span className="text-slate-500 text-[10px]">NOT READY</span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-slate-950 shadow-md"
          style={{ backgroundColor: player.color }}
        >
          🏎️
        </div>
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-1.5">
            {player.name}
            {isLocal && <span className="text-xs font-mono text-cyan-400">(YOU)</span>}
          </h3>
          <span className="text-xs text-slate-400">{car.name}</span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mb-4 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
        <div>
          <span className="text-slate-500 block text-[9px]">TOP SPEED</span>
          <span className="text-slate-200 font-bold">{car.topSpeed} KM/H</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px]">OPTIMAL RPM</span>
          <span className="text-emerald-400 font-bold">{car.optimalShiftRpm} RPM</span>
        </div>
      </div>

      {/* Live livery picker if this is local player */}
      {isLocal && (
        <div className="pt-3 border-t border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Quick Paint Tweak
          </span>
          <div className="flex items-center gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onCustomizeColor(c.hex)}
                className={`w-6 h-6 rounded-lg transition-transform ${
                  player.color === c.hex ? 'scale-110 ring-2 ring-white' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.label}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
