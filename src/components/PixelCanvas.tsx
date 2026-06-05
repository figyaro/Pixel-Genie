import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Tool, Layer } from '../types';
import { cn } from '../lib/utils';

interface PixelCanvasProps {
  layers: Layer[];
  activeLayerId: string;
  resolution: number;
  selectedColor: string;
  tool: Tool;
  zoom: number;
  selectionMask: boolean[][];
  selectionTolerance: number;
  onGridChange: (newGrid: (string | null)[][], saveHistory?: boolean) => void;
  onColorPick: (color: string) => void;
  onSelectionChange: (mask: boolean[][]) => void;
  onClearSelection: () => void;
}

export const PixelCanvas: React.FC<PixelCanvasProps> = ({
  layers,
  activeLayerId,
  resolution,
  selectedColor,
  tool,
  zoom,
  selectionMask,
  selectionTolerance,
  onGridChange,
  onColorPick,
  onSelectionChange,
  onClearSelection,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef({ x: 0, y: 0 });

  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [lastSelectionPoint, setLastSelectionPoint] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const size = Math.floor(Math.min(width, height));
        if (size <= 0) return;
        
        const adjustedSize = Math.floor(size / resolution) * resolution;
        
        setDimensions(prev => {
          if (prev.width === adjustedSize) return prev;
          return { width: adjustedSize, height: adjustedSize };
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [resolution]);

  const cellSize = Math.floor((dimensions.width / resolution) * zoom);
  const canvasSize = cellSize * resolution;

  // Reset pan when resolution or zoom changes significantly (optional, but keeps it centered)
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
  }, [resolution]);

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw layers from bottom to top
    layers.forEach(layer => {
      if (!layer.visible) return;
      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          const color = layer.grid[y][x];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }
    });

    // Draw grid lines
    const gridOpacity = resolution <= 32 ? 0.2 : resolution <= 64 ? 0.1 : 0.05;
    ctx.strokeStyle = `rgba(128, 128, 128, ${gridOpacity})`;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= resolution; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvasSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvasSize, i * cellSize);
      ctx.stroke();
    }

    // Draw selection mask
    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'; // Blue semi-transparent
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.lineWidth = 2;
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        if (selectionMask[y][x]) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          
          // Draw border for selection
          if (x === 0 || !selectionMask[y][x - 1]) ctx.strokeRect(x * cellSize, y * cellSize, 0, cellSize);
          if (x === resolution - 1 || !selectionMask[y][x + 1]) ctx.strokeRect((x + 1) * cellSize, y * cellSize, 0, cellSize);
          if (y === 0 || !selectionMask[y - 1][x]) ctx.strokeRect(x * cellSize, y * cellSize, cellSize, 0);
          if (y === resolution - 1 || !selectionMask[y + 1][x]) ctx.strokeRect(x * cellSize, (y + 1) * cellSize, cellSize, 0);
        }
      }
    }
  }, [layers, resolution, cellSize, canvasSize, selectionMask]);

  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  // Re-calculate selection when tolerance changes
  useEffect(() => {
    if (lastSelectionPoint && tool === 'select') {
      handleAction(lastSelectionPoint.x, lastSelectionPoint.y, false);
    }
  }, [selectionTolerance]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = Math.floor((clientX - rect.left) / (rect.width / resolution));
    const y = Math.floor((clientY - rect.top) / (rect.height / resolution));

    if (x >= 0 && x < resolution && y >= 0 && y < resolution) {
      return { x, y };
    }
    return null;
  };

  const colorDistance = (c1: string | null, c2: string | null) => {
    if (c1 === c2) return 0;
    if (!c1 || !c2) return 442; // Max possible distance sqrt(255^2 * 3)
    
    const getRGB = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };

    const rgb1 = getRGB(c1);
    const rgb2 = getRGB(c2);
    
    return Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
    );
  };

  const handleAction = (x: number, y: number, isFinal = false) => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;

    const newGrid = activeLayer.grid.map(row => [...row]);

    if (tool === 'pencil') {
      newGrid[y][x] = selectedColor;
      onGridChange(newGrid, isFinal);
    } else if (tool === 'eraser') {
      newGrid[y][x] = null;
      onGridChange(newGrid, isFinal);
    } else if (tool === 'picker') {
      // Pick from the top-most visible layer that has a color at this pixel
      for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (layer.visible && layer.grid[y][x]) {
          onColorPick(layer.grid[y][x]!);
          break;
        }
      }
    } else if (tool === 'bucket') {
      const targetColor = activeLayer.grid[y][x];
      if (targetColor === selectedColor) return;

      const fill = (cx: number, cy: number) => {
        if (cx < 0 || cx >= resolution || cy < 0 || cy >= resolution) return;
        if (newGrid[cy][cx] !== targetColor) return;

        newGrid[cy][cx] = selectedColor;
        fill(cx + 1, cy);
        fill(cx - 1, cy);
        fill(cx, cy + 1);
        fill(cx, cy - 1);
      };

      fill(x, y);
      onGridChange(newGrid, true);
    } else if (tool === 'select') {
      const targetColor = activeLayer.grid[y][x];
      const newMask = Array(resolution).fill(null).map(() => Array(resolution).fill(false));
      
      // Tolerance is 0-100, map to 0-442
      const toleranceValue = (selectionTolerance / 100) * 442;

      const select = (cx: number, cy: number) => {
        if (cx < 0 || cx >= resolution || cy < 0 || cy >= resolution) return;
        if (newMask[cy][cx]) return;
        
        const currentColor = activeLayer.grid[cy][cx];
        if (colorDistance(currentColor, targetColor) > toleranceValue) return;

        newMask[cy][cx] = true;
        select(cx + 1, cy);
        select(cx - 1, cy);
        select(cx, cy + 1);
        select(cx, cy - 1);
      };

      select(x, y);
      onSelectionChange(newMask);
      setLastSelectionPoint({ x, y });
    } else if (tool === 'magic-cut') {
      const targetColor = activeLayer.grid[y][x];
      const newMask = Array(resolution).fill(null).map(() => Array(resolution).fill(false));
      const toleranceValue = (selectionTolerance / 100) * 442;

      // 1. Find the connected component
      const component: {x: number, y: number}[] = [];
      const visited = Array(resolution).fill(null).map(() => Array(resolution).fill(false));
      
      const stack = [{x, y}];
      while (stack.length > 0) {
        const {x: px, y: py} = stack.pop()!;
        if (px < 0 || px >= resolution || py < 0 || py >= resolution) continue;
        if (visited[py][px]) continue;
        
        const currentColor = activeLayer.grid[py][px];
        if (colorDistance(currentColor, targetColor) > toleranceValue) continue;

        visited[py][px] = true;
        component.push({x: px, y: py});
        newMask[py][px] = true;

        stack.push({x: px + 1, y: py});
        stack.push({x: px - 1, y: py});
        stack.push({x: px, y: py + 1});
        stack.push({x: px, y: py - 1});
      }

      // 2. Intelligent Edge Softening
      const newGrid = activeLayer.grid.map(row => [...row]);

      component.forEach(({x: px, y: py}) => {
        let neighborsInComponent = 0;
        const neighbors = [
          {x: px+1, y: py}, {x: px-1, y: py}, {x: px, y: py+1}, {x: px, y: py-1},
          {x: px+1, y: py+1}, {x: px-1, y: py-1}, {x: px+1, y: py-1}, {x: px-1, y: py+1}
        ];

        neighbors.forEach(n => {
          if (n.x >= 0 && n.x < resolution && n.y >= 0 && n.y < resolution) {
            if (newMask[n.y][n.x]) neighborsInComponent++;
          }
        });

        // If not all 8 neighbors are in component, it's an edge
        if (neighborsInComponent < 8) {
          const color = activeLayer.grid[py][px];
          if (color) {
            // Calculate new alpha based on neighbor density
            // 8 neighbors = 100% alpha, 0 neighbors = 0% alpha
            const alphaFactor = neighborsInComponent / 8;
            
            // Extract current color and apply alpha
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            let currentAlpha = color.length === 9 ? parseInt(color.slice(7, 9), 16) : 255;
            
            const newAlpha = Math.floor(currentAlpha * alphaFactor);
            const hexAlpha = newAlpha.toString(16).padStart(2, '0');
            newGrid[py][px] = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${hexAlpha}`;
          }
        }
      });

      onGridChange(newGrid, true);
      onSelectionChange(newMask);
      setLastSelectionPoint({ x, y });
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    // Hand tool, Middle click, or Space+Click or zoomed in drag for panning
    if (tool === 'hand' || e.button === 1 || (zoom > 1 && e.shiftKey)) {
      setIsPanning(true);
      lastPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    setIsDrawing(true);
    const coords = getCoordinates(e);
    if (coords) handleAction(coords.x, coords.y, false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      
      setPanOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      
      lastPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!isDrawing || tool === 'bucket' || tool === 'picker') return;
    const coords = getCoordinates(e);
    if (coords) handleAction(coords.x, coords.y, false);
  };

  const onMouseUp = () => {
    if (isDrawing) {
      const activeLayer = layers.find(l => l.id === activeLayerId);
      if (activeLayer) {
        onGridChange(activeLayer.grid, true);
      }
    }
    setIsDrawing(false);
    setIsPanning(false);
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full max-w-full min-w-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded-xl p-4 overflow-hidden border-2 border-dashed border-zinc-300 dark:border-zinc-700 relative"
    >
      <div 
        className="flex items-center justify-center pointer-events-auto transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className={cn(
            "shadow-2xl bg-white block",
            tool === 'hand' ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-crosshair"
          )}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onDoubleClick={onClearSelection}
          onMouseLeave={onMouseUp}
        />
      </div>
    </div>
  );
};
