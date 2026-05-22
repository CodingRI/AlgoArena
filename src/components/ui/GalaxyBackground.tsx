import { useEffect, useRef, useMemo } from 'react';
import { useSettingsStore } from '@/store/panelStore';

interface Star {
  x: number;
  y: number;
  r: number;
  opacity: number;
  speed: number;
  twinkleOffset: number;
}

const GalaxyBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { settings } = useSettingsStore();
  const animFrameRef = useRef<number>(0);

  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: 80 }, () => ({
      x: Math.random() * 360,
      y: Math.random() * 580,
      r: Math.random() * 1.5 + 0.3,
      opacity: Math.random() * 0.6 + 0.1,
      speed: Math.random() * 0.3 + 0.05,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));
  }, []);

  useEffect(() => {
    if (!settings.showGalaxyParticles) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.008;

      stars.forEach((star) => {
        const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(t * star.speed * 4 + star.twinkleOffset));
        const alpha = star.opacity * twinkle;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 160, 255, ${alpha})`;
        ctx.fill();

        // Occasional blue stars
        if (star.r > 1.2) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.r * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(99, 102, 241, ${alpha * 0.15})`;
          ctx.fill();
        }
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [stars, settings.showGalaxyParticles]);

  if (!settings.showGalaxyParticles) return null;

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={580}
      className="absolute inset-0 pointer-events-none opacity-60"
      style={{ borderRadius: 'inherit' }}
    />
  );
};

export default GalaxyBackground;
