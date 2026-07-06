'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sliders, ZoomIn, Sun, Contrast, Eye, RefreshCw, Upload } from 'lucide-react';

interface DicomViewerProps {
  onAnalyze: (imageUrl: string) => void;
  isAnalyzing: boolean;
}

export default function DicomViewer({ onAnalyze, isAnalyzing }: DicomViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [invert, setInvert] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and reset filter
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) ${invert ? 'invert(100%)' : ''}`;

    ctx.save();
    // Apply zoom and panning position offsets
    ctx.translate(canvas.width / 2 + position.x, canvas.height / 2 + position.y);
    ctx.scale(zoom, zoom);

    // Draw Simulated High-Tech Dental Panoramic X-Ray Radiography
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(-200, -120, 400, 240);

    // Jaw arch guide
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 20, 120, Math.PI, 0);
    ctx.stroke();

    // Draw simulated radiography teeth
    ctx.fillStyle = '#e2e8f0';
    for (let i = -6; i <= 6; i++) {
      const angle = (i * Math.PI) / 16 - Math.PI / 2;
      const x = 110 * Math.cos(angle);
      const y = 80 * Math.sin(angle) + 20;

      // Draw Crown
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();

      // Draw Root
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - (i % 2 === 0 ? 25 : 18));
      ctx.stroke();

      // Highlight a decayed cavity (Tooth 46 equivalent node)
      if (i === 2) {
        ctx.fillStyle = '#ef4444'; // Red decayed spot
        ctx.beginPath();
        ctx.arc(x + 3, y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
      }
    }

    // Grid overlays (adds high-tech clinical scanner aesthetic)
    ctx.restore();
    ctx.filter = 'none';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }, [zoom, brightness, contrast, invert, position]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const resetFilters = () => {
    setZoom(1);
    setBrightness(100);
    setContrast(100);
    setInvert(false);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">RVG / DICOM Dijital Röntgen Görüntüleyici</h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Görüntüyü sürükleyerek kaydırabilir, filtreleri kullanabilirsiniz.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={resetFilters} 
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
            title="Sıfırla"
          >
            <RefreshCw size={14} />
          </button>
          <button 
            onClick={() => onAnalyze('panoramic_xray.png')}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-2 bg-metronic-primary hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-metronic-primary/10 disabled:opacity-50"
          >
            <Sliders size={13} />
            {isAnalyzing ? 'AI Analiz Ediyor...' : 'AI Analizi Çalıştır'}
          </button>
        </div>
      </div>

      <div className="relative border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden bg-[#06080c] flex items-center justify-center cursor-move">
        <canvas 
          ref={canvasRef} 
          width={580} 
          height={320}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        />
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] text-slate-300 font-mono">
          Zoom: {Math.round(zoom * 100)}% | Px: {position.x}, {position.y}
        </div>
      </div>

      {/* Adjustments Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs font-semibold text-slate-500">
        <div className="space-y-1">
          <label className="flex items-center gap-1.5"><ZoomIn size={12} /> Yakınlaştırma (Zoom)</label>
          <input 
            type="range" min="0.5" max="3" step="0.1" value={zoom} onChange={e => setZoom(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded accent-blue-600"
          />
        </div>
        <div className="space-y-1">
          <label className="flex items-center gap-1.5"><Sun size={12} /> Parlaklık (Brightness)</label>
          <input 
            type="range" min="50" max="200" value={brightness} onChange={e => setBrightness(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded accent-blue-600"
          />
        </div>
        <div className="space-y-1">
          <label className="flex items-center gap-1.5"><Contrast size={12} /> Kontrast (Contrast)</label>
          <input 
            type="range" min="50" max="200" value={contrast} onChange={e => setContrast(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded accent-blue-600"
          />
        </div>
        <div className="flex items-center justify-between pt-4">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input 
              type="checkbox" checked={invert} onChange={e => setInvert(e.target.checked)}
              className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 rounded border-slate-300"
            />
            Negatif Görünüm (Invert)
          </label>
        </div>
      </div>
    </div>
  );
}
