/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { PixelCanvas } from './components/PixelCanvas';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { ImageCropper } from './components/ImageCropper';
import { Tool, RESOLUTIONS, DEFAULT_PALETTE, Layer } from './types';
import { generatePixelArt, refinePixelArt, ai } from './services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, AlertCircle, Layers as LayersIcon, Plus, Eye, EyeOff, Trash2, GripVertical } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [resolution, setResolution] = useState(32);
  const [layers, setLayers] = useState<Layer[]>(() => [
    {
      id: 'base',
      name: 'Canvas Layer',
      grid: Array(32).fill(null).map(() => Array(32).fill('#ffffff')),
      visible: true
    }
  ]);
  const [activeLayerId, setActiveLayerId] = useState('base');
  const [history, setHistory] = useState<Layer[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [tool, setTool] = useState<Tool>('pencil');

  // Clear selection when tool changes
  useEffect(() => {
    onClearSelection();
  }, [tool]);

  const [zoom, setZoom] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [palette, setPalette] = useState<string[]>(DEFAULT_PALETTE);
  const [error, setError] = useState<string | null>(null);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [currentUploadPrompt, setCurrentUploadPrompt] = useState<string>('');
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(true);
  const [selectionTolerance, setSelectionTolerance] = useState(10);
  const [selectionMask, setSelectionMask] = useState<boolean[][]>(() => 
    Array(resolution).fill(null).map(() => Array(resolution).fill(false))
  );

  // Initial history state
  useEffect(() => {
    if (history.length === 0) {
      setHistory([layers]);
      setHistoryIndex(0);
    }
  }, []);

  // Resize grid when resolution changes
  useEffect(() => {
    setLayers(prevLayers => {
      if (prevLayers[0].grid.length === resolution) return prevLayers;

      const newLayers = prevLayers.map(layer => ({
        ...layer,
        grid: Array(resolution).fill(null).map((_, y) => 
          Array(resolution).fill(null).map((_, x) => {
            const oldY = Math.floor((y / resolution) * layer.grid.length);
            const oldX = Math.floor((x / resolution) * layer.grid[0].length);
            return layer.grid[oldY]?.[oldX] || (layer.id === 'base' ? '#ffffff' : null);
          })
        )
      }));
      
      // When resolution changes, we treat it as a new starting point for history to avoid complexity
      setHistory([newLayers]);
      setHistoryIndex(0);
      setSelectionMask(Array(resolution).fill(null).map(() => Array(resolution).fill(false)));
      return newLayers;
    });
  }, [resolution]);

  const onGridChange = useCallback((newGrid: (string | null)[][], saveHistory = true) => {
    setLayers(prev => {
      const newLayers = prev.map(l => l.id === activeLayerId ? { ...l, grid: newGrid } : l);
      
      if (saveHistory) {
        setHistory(prevHistory => {
          const newHistory = prevHistory.slice(0, historyIndex + 1);
          newHistory.push(newLayers);
          // Keep up to 50 steps, but user specifically asked for "at least 5"
          if (newHistory.length > 50) return newHistory.slice(1);
          return newHistory;
        });
        setHistoryIndex(prevIndex => {
          const newIndex = prevIndex + 1;
          return Math.min(newIndex, 49); // Adjust index if we shifted
        });
      }
      
      return newLayers;
    });
  }, [historyIndex, activeLayerId]);

  const onUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setLayers(history[newIndex]);
    }
  };

  const onRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setLayers(history[newIndex]);
    }
  };

  const onClear = () => {
    setLayers(prev => {
      const newLayers = prev.map(l => ({
        ...l,
        grid: Array(resolution).fill(null).map(() => Array(resolution).fill(l.id === 'base' ? '#ffffff' : null))
      }));
      const activeGrid = newLayers.find(l => l.id === activeLayerId)!.grid;
      onGridChange(activeGrid);
      return newLayers;
    });
  };

  const onInvertSelection = () => {
    setSelectionMask(prev => prev.map(row => row.map(selected => !selected)));
  };

  const onDeleteSelection = () => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;

    const newGrid = activeLayer.grid.map((row, y) => 
      row.map((color, x) => selectionMask[y][x] ? null : color)
    );
    onGridChange(newGrid, true);
  };

  const onCopySelection = () => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;

    const newId = `layer-${Date.now()}`;
    const newGrid = Array(resolution).fill(null).map((_, y) => 
      Array(resolution).fill(null).map((_, x) => 
        selectionMask[y][x] ? activeLayer.grid[y][x] : null
      )
    );

    const newLayer: Layer = {
      id: newId,
      name: `${activeLayer.name} (Selection)`,
      grid: newGrid,
      visible: true
    };

    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newId);
  };

  const onClearSelection = () => {
    setSelectionMask(Array(resolution).fill(null).map(() => Array(resolution).fill(false)));
  };

  const onDownload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    layers.forEach(layer => {
      if (!layer.visible) return;
      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          const color = layer.grid[y][x];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    const link = document.createElement('a');
    link.download = `pixel-art-${resolution}x${resolution}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const activeLayer = layers.find(l => l.id === activeLayerId);
      if (!activeLayer) return;

      const isLayerEmpty = activeLayer.grid.flat().every(c => c === null || c.toLowerCase() === '#ffffff');
      
      let data;
      if (isLayerEmpty) {
        data = await generatePixelArt(prompt, resolution);
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = resolution;
        canvas.height = resolution;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          activeLayer.grid.forEach((row, y) => {
            row.forEach((color, x) => {
              if (color) {
                ctx.fillStyle = color;
                ctx.fillRect(x, y, 1, 1);
              }
            });
          });
          const base64 = canvas.toDataURL();
          data = await refinePixelArt(base64, prompt, resolution);
        } else {
          data = await generatePixelArt(prompt, resolution);
        }
      }

      onGridChange(data.grid);
      setPalette(data.palette);
    } catch (err) {
      console.error(err);
      setError('Failed to generate pixel art. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = async (file: File, prompt: string) => {
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setCroppingImage(base64);
        setCurrentUploadPrompt(prompt);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setError('Failed to load image. Please try again.');
    }
  };

  const handleCroppedImage = async (croppedBase64: string, removeBackground: boolean) => {
    setCroppingImage(null);
    setIsGenerating(true);
    try {
      let finalPrompt = currentUploadPrompt;
      if (removeBackground) {
        finalPrompt = `${currentUploadPrompt ? currentUploadPrompt + '. ' : ''}Remove the background and isolate the main subject. Make the background transparent or pure white.`;
      }

      if (finalPrompt.trim()) {
        const pixelatedBase64 = await pixelateImageBase64(croppedBase64, resolution);
        const data = await refinePixelArt(pixelatedBase64, finalPrompt, resolution);
        onGridChange(data.grid);
        setPalette(data.palette);
      } else {
        const { grid: newGrid, palette: newPalette } = await pixelateImage(croppedBase64, resolution);
        onGridChange(newGrid);
        setPalette(newPalette);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to process image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const pixelateImageBase64 = (base64: string, res: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = res;
        canvas.height = res;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(base64);

        // Center crop logic
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, res, res);
        resolve(canvas.toDataURL());
      };
      img.src = base64;
    });
  };

  const pixelateImage = (base64: string, res: number): Promise<{ grid: (string | null)[][], palette: string[] }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = res;
        canvas.height = res;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve({ grid: Array(res).fill(null).map(() => Array(res).fill('#ffffff')), palette: DEFAULT_PALETTE });

        // Center crop logic
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        // Draw image resized to resolution with center crop
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, res, res);
        
        const imageData = ctx.getImageData(0, 0, res, res).data;
        const newGrid: (string | null)[][] = [];
        const colorCounts: Record<string, number> = {};

        for (let y = 0; y < res; y++) {
          const row: (string | null)[] = [];
          for (let x = 0; x < res; x++) {
            const i = (y * res + x) * 4;
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const a = imageData[i + 3];
            
            if (a < 10) {
              row.push(null);
            } else {
              const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
              row.push(hex);
              colorCounts[hex.slice(0, 7)] = (colorCounts[hex.slice(0, 7)] || 0) + 1;
            }
          }
          newGrid.push(row);
        }

        const sortedColors = Object.entries(colorCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 24)
          .map(([color]) => color);

        resolve({ 
          grid: newGrid, 
          palette: sortedColors.length > 0 ? sortedColors : DEFAULT_PALETTE 
        });
      };
      img.src = base64;
    });
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 sm:px-8 bg-white dark:bg-zinc-950 z-50">
          <div className="flex items-center gap-2 sm:gap-3 ml-2 sm:ml-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                className="w-5 h-5 sm:w-6 sm:h-6 text-white"
              >
                <path d="M4 4H8V8H4V4Z" fill="currentColor" />
                <path d="M10 4H14V8H10V4Z" fill="currentColor" opacity="0.8" />
                <path d="M16 4H20V8H16V4Z" fill="currentColor" opacity="0.6" />
                <path d="M4 10H8V14H4V10Z" fill="currentColor" opacity="0.8" />
                <path d="M10 10H14V14H10V10Z" fill="currentColor" />
                <path d="M16 10H20V14H16V10Z" fill="currentColor" opacity="0.8" />
                <path d="M4 16H8V20H4V16Z" fill="currentColor" opacity="0.6" />
                <path d="M10 16H14V20H10V16Z" fill="currentColor" opacity="0.8" />
                <path d="M16 16H20V20H16V16Z" fill="currentColor" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">PixelGenie</h1>
              <p className="hidden sm:block text-[10px] text-zinc-500 font-medium uppercase tracking-widest">AI Pixel Art Studio</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: selectedColor }} />
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative">
          <Toolbar 
            isExpanded={isToolbarExpanded}
            setIsExpanded={setIsToolbarExpanded}
            currentTool={tool}
            setTool={setTool}
            zoom={zoom}
            setZoom={setZoom}
            onUndo={onUndo}
            onRedo={onRedo}
            onClear={onClear}
            onDownload={onDownload}
            onInvertSelection={onInvertSelection}
            onDeleteSelection={onDeleteSelection}
            onCopySelection={onCopySelection}
            onClearSelection={onClearSelection}
            selectionTolerance={selectionTolerance}
            setSelectionTolerance={setSelectionTolerance}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            hasSelection={selectionMask.flat().some(s => s)}
          />

          <div className={cn(
            "flex-1 p-4 flex items-center justify-center overflow-hidden min-w-0 transition-all duration-300 ease-in-out",
            isToolbarExpanded ? "pl-20" : "pl-4"
          )}>
            <AnimatePresence mode="wait">
            <motion.div
              key={resolution}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex items-center justify-center min-w-0"
            >
              <PixelCanvas 
                layers={layers}
                activeLayerId={activeLayerId}
                resolution={resolution}
                selectedColor={selectedColor}
                tool={tool}
                zoom={zoom}
                selectionMask={selectionMask}
                selectionTolerance={selectionTolerance}
                onGridChange={onGridChange}
                onColorPick={setSelectedColor}
                onSelectionChange={setSelectionMask}
                onClearSelection={onClearSelection}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {error && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 hover:opacity-70">✕</button>
          </motion.div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm flex flex-col items-center justify-center z-40">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full mb-6"
            />
            <h2 className="text-2xl font-bold mb-2">Genie is working...</h2>
            <p className="text-zinc-500 animate-pulse">Creating your pixel masterpiece</p>
          </div>
        )}
      </main>

      <Sidebar 
        grid={layers.find(l => l.id === activeLayerId)?.grid || layers[0].grid}
        resolution={resolution}
        setResolution={setResolution}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        onGenerate={handleGenerate}
        onImageUpload={handleImageUpload}
        isGenerating={isGenerating}
        palette={palette}
        layers={layers}
        setLayers={setLayers}
        activeLayerId={activeLayerId}
        setActiveLayerId={setActiveLayerId}
      />

      <AnimatePresence>
        {croppingImage && (
          <ImageCropper 
            image={croppingImage}
            onCrop={handleCroppedImage}
            onCancel={() => setCroppingImage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
