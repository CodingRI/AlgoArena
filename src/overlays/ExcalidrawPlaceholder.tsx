import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Eraser, Square, Circle, Minus, Type, Trash2, Download } from 'lucide-react';

type Tool = 'pen' | 'eraser' | 'rect' | 'circle' | 'line' | 'text';

const COLORS = ['#c084fc', '#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#ffffff', '#f87171'];

interface Point { x: number; y: number }

const ExcalidrawPlaceholder = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#c084fc');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'rgba(7, 5, 26, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setLastPoint(getPoint(e));
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPoint) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const current = getPoint(e);

    ctx.beginPath();
    ctx.strokeStyle = tool === 'eraser' ? 'rgba(7,5,26,0.95)' : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();

    setLastPoint(current);
  };

  const endDraw = () => { setIsDrawing(false); setLastPoint(null); };

  const clear = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.fillStyle = 'rgba(7, 5, 26, 0.4)';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const TOOLS: { id: Tool; icon: typeof Pencil; label: string }[] = [
    { id: 'pen', icon: Pencil, label: 'Pen' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'rect', icon: Square, label: 'Rect' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'text', icon: Type, label: 'Text' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5 flex-wrap">
        {/* Tools */}
        <div className="flex gap-1">
          {TOOLS.map(({ id, icon: Icon, label }) => (
            <motion.button key={id} whileTap={{ scale: 0.85 }} onClick={() => setTool(id)} title={label}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors
                ${tool === id ? 'bg-violet-500/30 text-violet-300' : 'bg-white/5 text-zinc-500 hover:text-zinc-300'}`}>
              <Icon className="w-3.5 h-3.5" />
            </motion.button>
          ))}
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Colors */}
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <motion.button key={c} whileTap={{ scale: 0.8 }} onClick={() => setColor(c)}
              className={`w-4 h-4 rounded-full border transition-all ${color === c ? 'border-white scale-125' : 'border-transparent'}`}
              style={{ background: c }} />
          ))}
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Stroke width */}
        <div className="flex gap-1 items-center">
          {[1, 2, 4].map((w) => (
            <motion.button key={w} whileTap={{ scale: 0.8 }} onClick={() => setStrokeWidth(w)}
              className={`rounded-full transition-colors ${strokeWidth === w ? 'bg-violet-400' : 'bg-zinc-600'}`}
              style={{ width: w * 4 + 4, height: w * 4 + 4 }} />
          ))}
        </div>

        <div className="flex-1" />

        <motion.button whileTap={{ scale: 0.85 }} onClick={clear}
          className="w-7 h-7 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center">
          <Trash2 className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full cursor-crosshair"
          style={{ background: 'rgba(3, 2, 10, 0.6)' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
        />

        {/* Placeholder label */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="text-[10px] text-zinc-700 font-mono bg-black/20 px-2 py-1 rounded">
            Shared Canvas — sync enabled when backend connected
          </span>
        </div>
      </div>
    </div>
  );
};

export default ExcalidrawPlaceholder;
