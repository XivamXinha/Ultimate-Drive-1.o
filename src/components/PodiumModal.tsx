import React, { useEffect } from 'react';
import { PlayerInfo, RacerTelemetry } from '../types/game';
import { Trophy, RotateCcw, ArrowLeft, Zap, Gauge, Timer } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface PodiumModalProps {
  players: PlayerInfo[];
  racers: Record<string, RacerTelemetry>;
  winnerId: string | null;
  localPlayerId: string | null;
  onRematch: () => void;
  onReturnToPaddock: () => void;
}

export const PodiumModal: React.FC<PodiumModalProps> = ({
  players,
  racers,
  winnerId,
  localPlayerId,
  onRematch,
  onReturnToPaddock,
}) => {
  const isLocalWinner = winnerId === localPlayerId;
  const winner = players.find((p) => p.id === winnerId);

  useEffect(() => {
    sound.playVictoryFanfare();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Trophy & Winner Title */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20 mb-4 animate-bounce">
          <Trophy className="w-9 h-9 stroke-[2.5]" />
        </div>

        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
          1/4 Mile Sprint Finished
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight mb-2">
          {isLocalWinner ? '🏆 VICTORY IS YOURS!' : winner ? `🏆 ${winner.name.toUpperCase()} WINS!` : 'RACE COMPLETE'}
        </h2>

        <p className="text-xs text-slate-400 mb-6">
          Both dragsters crossed the 400m checkered line. Check the telemetry below:
        </p>

        {/* Telemetry Comparison Grid */}
        <div className="w-full grid grid-cols-2 gap-3 mb-6">
          {players.map((p) => {
            const telemetry = racers[p.id];
            const isWinner = p.id === winnerId;
            const isLocal = p.id === localPlayerId;
            const timeSeconds = telemetry?.finishTime ? (telemetry.finishTime / 1000).toFixed(3) : '--.---';

            return (
              <div
                key={p.id}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between ${
                  isWinner
                    ? 'bg-amber-950/20 border-amber-500/80 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold truncate text-white flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.name}
                    </span>
                    {isWinner && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-700/60">
                        1ST
                      </span>
                    )}
                  </div>
                  {isLocal && <span className="text-[10px] text-cyan-400 font-mono block mb-2">(YOU)</span>}
                </div>

                <div className="space-y-2 text-xs font-mono pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Timer className="w-3 h-3" /> Time:
                    </span>
                    <span className="font-bold text-white">{timeSeconds}s</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Gauge className="w-3 h-3" /> Top Speed:
                    </span>
                    <span className="text-slate-200">{telemetry?.maxSpeedReached || 0} km/h</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Perfects:
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {telemetry?.perfectShifts || 0}/{telemetry?.totalShifts || 0}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onRematch}
            className="w-full sm:flex-1 py-3.5 rounded-xl font-bold bg-gradient-to-r from-red-600 to-amber-500 hover:brightness-110 active:scale-98 text-slate-950 text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Rematch Grid</span>
          </button>

          <button
            onClick={onReturnToPaddock}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Paddock</span>
          </button>
        </div>
      </div>
    </div>
  );
};
