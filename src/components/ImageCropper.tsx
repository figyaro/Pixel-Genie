import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { cn } from '../lib/utils';
import { ZoomIn, ZoomOut, Check, X, Move, Scissors } from 'lucide-react';

interface ImageCropperProps {
  image: string;
  onCrop: (croppedImage: string, removeBackground: boolean) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ image, onCrop, onCancel }) => {
  const [zoom, setZoom] = useState(1);
  const [removeBackground, setRemoveBackground] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Pinch to zoom state
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);
  const [lastSelectionPoint, setLastSelectionPoint] = useState<{x: number, y: number} | null>(null);

  const handleCrop = () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    const size = 512; // Internal resolution for cropping
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = containerRef.current.getBoundingClientRect();
    const imgRect = imageRef.current.getBoundingClientRect();

    // Calculate the source area of the image that is currently in the center square
    const scale = imageRef.current.naturalWidth / imgRect.width;
    
    const sx = (rect.left - imgRect.left) * scale;
    const sy = (rect.top - imgRect.top) * scale;
    const sWidth = rect.width * scale;
    const sHeight = rect.height * scale;

    ctx.drawImage(imageRef.current, sx, sy, sWidth, sHeight, 0, 0, size, size);
    onCrop(canvas.toDataURL(), removeBackground);
  };

  const adjustZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 0.1), 5));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);

      if (lastPinchDistance.current !== null) {
        const delta = distance - lastPinchDistance.current;
        const zoomDelta = delta * 0.005; // Sensitivity
        setZoom(prev => Math.min(Math.max(prev + zoomDelta, 0.1), 5));
      }
      lastPinchDistance.current = distance;
    }
  };

  const handleTouchEnd = () => {
    lastPinchDistance.current = null;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-start p-4 sm:p-8 overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col gap-4 sm:gap-6 py-4 sm:py-12">
        <div className="flex items-center justify-between text-white">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Adjust Image</h2>
            <p className="text-zinc-400 text-xs sm:text-sm">Drag and zoom to frame your pixel art</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:bg-white/10">
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div 
          ref={viewportRef}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative aspect-square w-full bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center cursor-move touch-none"
        >
          {/* The "Crop Area" - a fixed square in the middle */}
          <div 
            ref={containerRef}
            className="absolute z-10 w-3/4 aspect-square border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none"
          >
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="border-[0.5px] border-white/20" />
              ))}
            </div>
          </div>

          <motion.img
            ref={imageRef}
            src={image}
            style={{ 
              x, 
              y, 
              scale: zoom,
              touchAction: 'none'
            }}
            drag
            dragMomentum={false}
            className="max-w-none"
          />
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-white text-[10px] sm:text-xs border border-white/10">
            <Move className="w-3 h-3" />
            Drag or Pinch to adjust
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-zinc-900/50 p-4 sm:p-6 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                removeBackground ? "bg-green-500 text-white" : "bg-zinc-800 text-zinc-400"
              )}>
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Remove Background</p>
                <p className="text-[10px] text-zinc-500">AI will detect and isolate the subject</p>
              </div>
            </div>
            <div 
              className={cn(
                "w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out",
                removeBackground ? "bg-green-500" : "bg-zinc-700"
              )}
              onClick={() => setRemoveBackground(!removeBackground)}
            >
              <div className={cn(
                "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out",
                removeBackground ? "translate-x-6" : "translate-x-0"
              )} />
            </div>
          </div>

          <div className="w-full h-px bg-white/5 my-1" />

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-zinc-400 hover:text-white shrink-0"
              onClick={() => adjustZoom(-0.01)}
            >
              <ZoomOut className="w-5 h-5" />
            </Button>
            <Slider
              value={[zoom]}
              min={0.1}
              max={5}
              step={0.01}
              onValueChange={(v: number | number[]) => {
                const val = Array.isArray(v) ? v[0] : v;
                setZoom(val);
              }}
              className="flex-1"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-zinc-400 hover:text-white shrink-0"
              onClick={() => adjustZoom(0.01)}
            >
              <ZoomIn className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel} className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5 h-10 sm:h-12">
              Cancel
            </Button>
            <Button onClick={handleCrop} className="flex-1 gap-2 h-10 sm:h-12">
              <Check className="w-4 h-4" />
              Confirm Crop
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
