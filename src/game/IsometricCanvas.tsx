import React, { useEffect, useRef } from 'react';
import { PlayerInfo, RacerTelemetry } from '../types/game';

interface IsometricCanvasProps {
  players: PlayerInfo[];
  racers: Record<string, RacerTelemetry>;
  localPlayerId: string | null;
  trackLength: number;
  countdown: number;
  phase: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  maxLife: number;
  life: number;
}

export const IsometricCanvas: React.FC<IsometricCanvasProps> = ({
  players,
  racers,
  localPlayerId,
  trackLength,
  countdown,
  phase,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const cameraRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Interpolated racer positions for silky 60fps render
  const smoothedPositions = useRef<Record<string, { dist: number; speed: number }>>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Iso projection helper:
    // angle = 26.565 deg (2:1 isometric ratio standard)
    const toIso = (x: number, y: number) => {
      const isoX = (x - y) * Math.cos(Math.PI / 6);
      const isoY = (x + y) * Math.sin(Math.PI / 6);
      return { x: isoX, y: isoY };
    };

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Update smoothed positions
      for (const p of players) {
        const raw = racers[p.id];
        if (!raw) continue;
        if (!smoothedPositions.current[p.id]) {
          smoothedPositions.current[p.id] = { dist: raw.distance, speed: raw.speed };
        } else {
          const current = smoothedPositions.current[p.id];
          // Lerp for smooth 60fps tracking
          current.dist += (raw.distance - current.dist) * 0.28;
          current.speed += (raw.speed - current.speed) * 0.25;
        }
      }

      // Camera target
      let targetDist = 0;
      const localRacer = localPlayerId ? smoothedPositions.current[localPlayerId] : null;
      if (localRacer) {
        targetDist = localRacer.dist;
      } else if (players[0] && smoothedPositions.current[players[0].id]) {
        targetDist = smoothedPositions.current[players[0].id].dist;
      }

      // Convert distance meters to canvas world coordinates (scale factor 12px per meter)
      const METER_SCALE = 13.5;
      const camTargetWorldX = targetDist * METER_SCALE;

      cameraRef.current.x += (camTargetWorldX - cameraRef.current.x) * 0.15;
      cameraRef.current.y = 0;

      // Clear background: Night cityscape aesthetic
      ctx.fillStyle = '#080C14';
      ctx.fillRect(0, 0, width, height);

      // Subtle ambient grid / neon skyline horizon in background
      ctx.save();
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const horizonY = height * 0.22;
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, horizonY);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(0, horizonY - 40, width, 40);
      ctx.restore();

      // World coordinate system setup with camera centering
      ctx.save();
      const centerX = width * 0.35;
      const centerY = height * 0.58;
      ctx.translate(centerX, centerY);

      // Draw Isometric Track
      // Track runs along World X axis from 0 to trackLength * METER_SCALE
      const totalTrackWorld = trackLength * METER_SCALE;
      const trackWidthWorld = 180; // Lane 0 and Lane 1 span -90 to +90 along Y

      // Draw Track Base
      const startIso = toIso(-80 - cameraRef.current.x, -trackWidthWorld / 2);
      const endIso = toIso(totalTrackWorld + 160 - cameraRef.current.x, -trackWidthWorld / 2);
      const endIso2 = toIso(totalTrackWorld + 160 - cameraRef.current.x, trackWidthWorld / 2);
      const startIso2 = toIso(-80 - cameraRef.current.x, trackWidthWorld / 2);

      // Track Asphalt Polygon
      ctx.beginPath();
      ctx.moveTo(startIso.x, startIso.y);
      ctx.lineTo(endIso.x, endIso.y);
      ctx.lineTo(endIso2.x, endIso2.y);
      ctx.lineTo(startIso2.x, startIso2.y);
      ctx.closePath();
      ctx.fillStyle = '#141824';
      ctx.fill();
      ctx.strokeStyle = '#222B3D';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Guard Rails & Neon Embankments
      // North Rail
      ctx.beginPath();
      ctx.moveTo(startIso.x, startIso.y);
      ctx.lineTo(endIso.x, endIso.y);
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#06B6D4';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // South Rail
      ctx.beginPath();
      ctx.moveTo(startIso2.x, startIso2.y);
      ctx.lineTo(endIso2.x, endIso2.y);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Center Divider line (dashed)
      ctx.beginPath();
      const centerStart = toIso(-60 - cameraRef.current.x, 0);
      const centerEnd = toIso(totalTrackWorld + 140 - cameraRef.current.x, 0);
      ctx.moveTo(centerStart.x, centerStart.y);
      ctx.lineTo(centerEnd.x, centerEnd.y);
      ctx.setLineDash([20, 16]);
      ctx.strokeStyle = '#FCD34D';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      // Start Line (x = 0)
      const startL1 = toIso(0 - cameraRef.current.x, -trackWidthWorld / 2);
      const startL2 = toIso(0 - cameraRef.current.x, trackWidthWorld / 2);
      ctx.beginPath();
      ctx.moveTo(startL1.x, startL1.y);
      ctx.lineTo(startL2.x, startL2.y);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Track Light Poles along track every 60 meters
      for (let m = 0; m <= trackLength + 40; m += 50) {
        const poleWorldX = m * METER_SCALE - cameraRef.current.x;
        // North side pole
        const pIso = toIso(poleWorldX, -trackWidthWorld / 2 - 15);
        ctx.beginPath();
        ctx.moveTo(pIso.x, pIso.y);
        ctx.lineTo(pIso.x, pIso.y - 45); // vertical pole
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Glowing lamp head
        ctx.beginPath();
        ctx.arc(pIso.x, pIso.y - 45, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#E0F2FE';
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Ground illumination puddle
        const puddle = toIso(poleWorldX, -trackWidthWorld / 4);
        const grad = ctx.createRadialGradient(puddle.x, puddle.y, 2, puddle.x, puddle.y, 28);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(puddle.x, puddle.y, 28, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Finish Line at 400m
      const finishWorldX = totalTrackWorld - cameraRef.current.x;
      const fL1 = toIso(finishWorldX, -trackWidthWorld / 2);
      const fL2 = toIso(finishWorldX, trackWidthWorld / 2);

      // Checkered bar
      ctx.beginPath();
      ctx.moveTo(fL1.x, fL1.y);
      ctx.lineTo(fL2.x, fL2.y);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 8;
      ctx.stroke();

      // Finish Gate Arch
      const archTop1X = fL1.x;
      const archTop1Y = fL1.y - 90;
      const archTop2X = fL2.x;
      const archTop2Y = fL2.y - 90;

      // Pillars
      ctx.beginPath();
      ctx.moveTo(fL1.x, fL1.y);
      ctx.lineTo(archTop1X, archTop1Y);
      ctx.moveTo(fL2.x, fL2.y);
      ctx.lineTo(archTop2X, archTop2Y);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Overhead truss
      ctx.beginPath();
      ctx.moveTo(archTop1X, archTop1Y);
      ctx.lineTo(archTop2X, archTop2Y);
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 5;
      ctx.stroke();

      // Finish Banner
      const archMidX = (archTop1X + archTop2X) / 2;
      const archMidY = (archTop1Y + archTop2Y) / 2;
      ctx.font = 'bold 13px Oswald, sans-serif';
      ctx.fillStyle = '#EF4444';
      ctx.textAlign = 'center';
      ctx.fillText('FINISH LINE (1/4 MILE)', archMidX, archMidY - 8);

      // Render Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        p.size *= 1.02;

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        const alpha = (1 - p.life / p.maxLife) * p.alpha;
        ctx.fillStyle = p.color.replace('ALPHA', alpha.toFixed(2));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sort racers by isometric depth (higher Y on track renders in front)
      const sortedPlayers = [...players].sort((a, b) => {
        const laneA = a.lane === 0 ? -45 : 45;
        const laneB = b.lane === 0 ? -45 : 45;
        return laneA - laneB;
      });

      // Render each car
      for (const player of sortedPlayers) {
        const pos = smoothedPositions.current[player.id];
        const rawTelemetry = racers[player.id];
        if (!pos) continue;

        // Lane offsets: Lane 0 is North (-42 world Y), Lane 1 is South (+42 world Y)
        const laneY = player.lane === 0 ? -45 : 45;
        const carWorldX = pos.dist * METER_SCALE - cameraRef.current.x;
        const carIso = toIso(carWorldX, laneY);

        // Spawn particles based on throttle / nitro / speed
        if (rawTelemetry && phase === 'RACING') {
          // Exhaust & smoke particles
          const exhaustWorldX = carWorldX - 18;
          const exhaustIso = toIso(exhaustWorldX, laneY);

          if (rawTelemetry.nitroActive) {
            // Intense nitro flame particles
            for (let k = 0; k < 2; k++) {
              particles.push({
                x: exhaustIso.x + (Math.random() - 0.5) * 4,
                y: exhaustIso.y + (Math.random() - 0.5) * 4,
                vx: -2.8 - Math.random() * 2,
                vy: (Math.random() - 0.5) * 1.5,
                size: 3 + Math.random() * 3,
                alpha: 0.85,
                color: 'rgba(6, 182, 212, ALPHA)',
                life: 0,
                maxLife: 16,
              });
            }
          } else if (rawTelemetry.speed > 20) {
            // Tire smoke / exhaust trail
            if (Math.random() < 0.4) {
              particles.push({
                x: exhaustIso.x,
                y: exhaustIso.y,
                vx: -1.2 - Math.random() * 1.5,
                vy: (Math.random() - 0.5) * 0.8,
                size: 2 + Math.random() * 3,
                alpha: 0.35,
                color: 'rgba(148, 163, 184, ALPHA)',
                life: 0,
                maxLife: 24,
              });
            }
          }
        }

        // Draw Car Shadow
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(carIso.x + 2, carIso.y + 6, 26, 11, Math.PI / 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fill();
        ctx.restore();

        // Draw Isometric Car Body
        drawIsometricCar(ctx, carIso.x, carIso.y, player.color, player.carModel, rawTelemetry?.nitroActive || false);

        // Name tag & speed badge floating above car
        ctx.save();
        const tagY = carIso.y - 36;
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';

        const isLocal = player.id === localPlayerId;
        // Name pill
        ctx.fillStyle = isLocal ? '#38BDF8' : '#F1F5F9';
        ctx.fillText(player.name + (isLocal ? ' (YOU)' : ''), carIso.x, tagY);

        // Speed indicator
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(`${Math.round(pos.speed)} KM/H`, carIso.x, tagY + 11);
        ctx.restore();
      }

      ctx.restore();

      // Christmas Tree Lights during Countdown overlay
      if (phase === 'COUNTDOWN' && countdown !== undefined) {
        drawChristmasTree(ctx, width * 0.5, 60, countdown);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [players, racers, localPlayerId, trackLength, countdown, phase]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

// Renders stylized 2.5D retro arcade racer sprite on canvas
function drawIsometricCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  carColor: string,
  _model: string,
  nitroActive: boolean
) {
  ctx.save();
  ctx.translate(x, y);

  // Isometric angle tilt
  const angle = Math.PI / 6; // 30 degrees
  ctx.rotate(angle);

  // Base dimensions of the car
  const length = 46;
  const width = 20;
  const height = 12;

  // Underbody chassis (dark)
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-length / 2, -width / 2, length, width);

  // Wheels
  const wheelL = 9;
  const wheelW = 4;
  ctx.fillStyle = '#020617';
  // Front left wheel
  ctx.fillRect(length / 2 - 14, -width / 2 - 2, wheelL, wheelW);
  // Front right wheel
  ctx.fillRect(length / 2 - 14, width / 2 - 2, wheelL, wheelW);
  // Rear left wheel
  ctx.fillRect(-length / 2 + 5, -width / 2 - 2, wheelL, wheelW);
  // Rear right wheel
  ctx.fillRect(-length / 2 + 5, width / 2 - 2, wheelL, wheelW);

  // Chrome rims
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(length / 2 - 11, -width / 2 - 1, 3, 2);
  ctx.fillRect(length / 2 - 11, width / 2 - 1, 3, 2);
  ctx.fillRect(-length / 2 + 8, -width / 2 - 1, 3, 2);
  ctx.fillRect(-length / 2 + 8, width / 2 - 1, 3, 2);

  // Main Car Body Lower Shell
  ctx.fillStyle = carColor;
  ctx.beginPath();
  ctx.roundRect(-length / 2, -width / 2 + 1, length, width - 2, 4);
  ctx.fill();

  // Highlight along hood
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.fillRect(-length / 2 + 6, -width / 2 + 3, length - 10, (width - 6) / 2);

  // Cabin / Windshield
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.roundRect(-length / 2 + 12, -width / 2 + 3, 19, width - 6, 2);
  ctx.fill();

  // Glass glare
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath();
  ctx.moveTo(length / 2 - 15, -width / 2 + 4);
  ctx.lineTo(length / 2 - 19, width / 2 - 4);
  ctx.lineTo(length / 2 - 23, width / 2 - 4);
  ctx.lineTo(length / 2 - 19, -width / 2 + 4);
  ctx.closePath();
  ctx.fill();

  // Rear spoiler
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(-length / 2 - 2, -width / 2 + 2, 4, width - 4);

  // Headlights
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(length / 2 - 1, -width / 2 + 3, 2, 3);
  ctx.fillRect(length / 2 - 1, width / 2 - 6, 2, 3);

  // Light cones projected forward
  ctx.beginPath();
  ctx.moveTo(length / 2, -width / 2 + 4);
  ctx.lineTo(length / 2 + 35, -width / 2 - 6);
  ctx.lineTo(length / 2 + 35, width / 2 + 6);
  ctx.lineTo(length / 2, width / 2 - 4);
  ctx.closePath();
  ctx.fillStyle = 'rgba(254, 240, 138, 0.08)';
  ctx.fill();

  // Taillights
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(-length / 2 - 1, -width / 2 + 3, 2, 3);
  ctx.fillRect(-length / 2 - 1, width / 2 - 6, 2, 3);

  // Nitro Afterburner Flame
  if (nitroActive) {
    ctx.fillStyle = '#06B6D4';
    ctx.shadowColor = '#06B6D4';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(-length / 2 - 1, -width / 2 + 4);
    ctx.lineTo(-length / 2 - 14 - Math.random() * 8, -width / 2 + 5);
    ctx.lineTo(-length / 2 - 1, -width / 2 + 6);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-length / 2 - 1, width / 2 - 6);
    ctx.lineTo(-length / 2 - 14 - Math.random() * 8, width / 2 - 5);
    ctx.lineTo(-length / 2 - 1, width / 2 - 4);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

// Renders the iconic Drag Racing Christmas Tree start lights
function drawChristmasTree(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  topY: number,
  count: number
) {
  ctx.save();
  const width = 110;
  const height = 90;

  // Bracket housing
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(centerX - width / 2, topY, width, height, 8);
  ctx.fill();
  ctx.stroke();

  // Title
  ctx.font = '700 11px Oswald, sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.textAlign = 'center';
  ctx.fillText('STAGING TREE', centerX, topY + 16);

  // Light positions:
  // Row 1: Amber 1 (count === 3)
  // Row 2: Amber 2 (count === 2)
  // Row 3: Amber 3 (count === 1)
  // Row 4: Green (count === 0)
  const bulbRadius = 8;
  const startBulbY = topY + 36;
  const gap = 24;

  const lights = [
    { label: '3', lit: count === 3, color: '#F59E0B' },
    { label: '2', lit: count === 2, color: '#F59E0B' },
    { label: '1', lit: count === 1, color: '#F59E0B' },
    { label: 'GO', lit: count === 0, color: '#10B981' },
  ];

  lights.forEach((light, i) => {
    const lx = centerX - 36 + i * 24;
    const ly = startBulbY + 16;

    ctx.beginPath();
    ctx.arc(lx, ly, bulbRadius, 0, Math.PI * 2);

    if (light.lit) {
      ctx.fillStyle = light.color;
      ctx.shadowColor = light.color;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#1E293B';
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  ctx.restore();
}
