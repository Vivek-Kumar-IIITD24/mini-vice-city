import { useEffect, useRef } from 'react';
import { MinimapBlip } from '../game/types';
import { ROAD_COORDS } from '../game/world/cityData';

interface MinimapProps {
  playerX: number;
  playerZ: number;
  playerHeading: number;
  blips: MinimapBlip[];
  wantedStars: number;
}

const MAP_SIZE = 164;
const WORLD_RANGE = 115; // meters visible from center to edge

export function Minimap({
  playerX,
  playerZ,
  playerHeading,
  blips,
  wantedStars,
}: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = MAP_SIZE;
    const h = MAP_SIZE;
    const cx = w / 2;
    const cy = h / 2;
    const scale = cx / WORLD_RANGE;

    const toScreenX = (wx: number) => cx + (wx - playerX) * scale;
    const toScreenY = (wz: number) => cy + (wz - playerZ) * scale;

    // 1. Ocean background
    ctx.fillStyle = '#0c3547';
    ctx.fillRect(0, 0, w, h);

    // 2. Island urban landmass (-136..120, -134..134)
    const landX = toScreenX(-136);
    const landY = toScreenY(-134);
    ctx.fillStyle = '#1b2332';
    ctx.fillRect(landX, landY, 256 * scale, 268 * scale);

    // 3. Golden Beach strip (x = 120..150)
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(toScreenX(118), toScreenY(-134), 32 * scale, 268 * scale);

    // 4. Coral Heights Park green patch (-82..-46, -68..-44)
    ctx.fillStyle = '#1f4d36';
    ctx.fillRect(toScreenX(-82), toScreenY(-68), 36 * scale, 24 * scale);

    // 5. Road grid avenues
    ctx.strokeStyle = '#3b475c';
    ctx.lineWidth = Math.max(4, 14 * scale);
    ctx.lineCap = 'square';
    for (const rx of ROAD_COORDS) {
      const sx = toScreenX(rx);
      ctx.beginPath();
      ctx.moveTo(sx, toScreenY(-112));
      ctx.lineTo(sx, toScreenY(112));
      ctx.stroke();
    }
    for (const rz of ROAD_COORDS) {
      const sy = toScreenY(rz);
      ctx.beginPath();
      ctx.moveTo(toScreenX(-112), sy);
      ctx.lineTo(toScreenX(112), sy);
      ctx.stroke();
    }

    // Center road lane hairlines
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)';
    ctx.lineWidth = 1;
    for (const rx of ROAD_COORDS) {
      const sx = toScreenX(rx);
      ctx.beginPath();
      ctx.moveTo(sx, toScreenY(-112));
      ctx.lineTo(sx, toScreenY(112));
      ctx.stroke();
    }
    for (const rz of ROAD_COORDS) {
      const sy = toScreenY(rz);
      ctx.beginPath();
      ctx.moveTo(toScreenX(-112), sy);
      ctx.lineTo(toScreenX(112), sy);
      ctx.stroke();
    }

    // 6. Blips (clamped neatly inside radar edge if off-screen for mission markers)
    for (let i = 0; i < blips.length; i++) {
      const b = blips[i];
      let bx = toScreenX(b.x);
      let by = toScreenY(b.z);

      if (b.kind === 'mission') {
        const dx = bx - cx;
        const dy = by - cy;
        const maxR = cx - 9;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) {
          bx = cx + (dx / dist) * maxR;
          by = cy + (dy / dist) * maxR;
        }
        // Gold diamond waypoint
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#090b12';
        ctx.lineWidth = 2;
        ctx.fillRect(-5, -5, 10, 10);
        ctx.strokeRect(-5, -5, 10, 10);
        ctx.restore();
      } else if (b.kind === 'police') {
        if (bx >= 2 && bx <= w - 2 && by >= 2 && by <= h - 2) {
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(bx, by, 4.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else if (b.kind === 'vehicle') {
        if (bx >= 4 && bx <= w - 4 && by >= 4 && by <= h - 4) {
          ctx.fillStyle = '#38bdf8';
          ctx.strokeStyle = '#090b12';
          ctx.lineWidth = 1.5;
          ctx.fillRect(bx - 3, by - 3, 6, 6);
          ctx.strokeRect(bx - 3, by - 3, 6, 6);
        }
      }
    }

    // 7. Player directional chevron at center (heading 0 = -Z = up on screen)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-playerHeading);
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#090b12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5.8, 6);
    ctx.lineTo(0, 3.2);
    ctx.lineTo(-5.8, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 8. North cardinal indicator
    ctx.fillStyle = 'rgba(9, 11, 18, 0.85)';
    ctx.fillRect(cx - 8, 2, 16, 13);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, 9);
  }, [playerX, playerZ, playerHeading, blips, wantedStars]);

  return (
    <div
      className="relative overflow-hidden border-2 shadow-xl"
      style={{
        width: MAP_SIZE,
        height: MAP_SIZE,
        borderColor: wantedStars > 0 ? '#ef4444' : 'rgba(245, 158, 11, 0.55)',
        backgroundColor: '#0c111d',
      }}
    >
      <canvas ref={canvasRef} width={MAP_SIZE} height={MAP_SIZE} className="block" />
    </div>
  );
}
