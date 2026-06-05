import React, { useState } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Pencil, Eraser, PaintBucket, Pipette, Undo, Redo, Download, Trash2, ZoomIn, ZoomOut, Search, Hand, Menu, X, Wand2, FlipHorizontal, Copy, Square, Scissors } from 'lucide-react';
import { Tool } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ToolbarProps {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  currentTool: Tool;
  setTool: (tool: Tool) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onDownload: () => void;
  onInvertSelection: () => void;
  onDeleteSelection: () => void;
  onCopySelection: () => void;
  onClearSelection: () => void;
  selectionTolerance: number;
  setSelectionTolerance: (val: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  isExpanded,
  setIsExpanded,
  currentTool,
  setTool,
  zoom,
  setZoom,
  onUndo,
  onRedo,
  onClear,
  onDownload,
  onInvertSelection,
  onDeleteSelection,
  onCopySelection,
  onClearSelection,
  selectionTolerance,
  setSelectionTolerance,
  canUndo,
  canRedo,
  hasSelection,
}) => {
  const tools = [
    { id: 'pencil', icon: Pencil, label: 'Pencil' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'bucket', icon: PaintBucket, label: 'Fill' },
    { id: 'picker', icon: Pipette, label: 'Picker' },
    { id: 'select', icon: Wand2, label: 'Smart Select' },
    { id: 'magic-cut', icon: Scissors, label: 'Magic Outline Cut' },
    { id: 'hand', icon: Hand, label: 'Hand' },
  ];

  return (
    <div className={cn(
      "absolute left-0 top-0 flex flex-col p-3 transition-all duration-300 ease-in-out z-40",
      isExpanded 
        ? "bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 w-16 h-full items-center" 
        : "w-16 h-16 bg-transparent border-none items-center justify-start"
    )}>
      {/* Hamburger Menu - Always Visible */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-10 h-10 rounded-xl mb-3 transition-all",
          isExpanded 
            ? "hover:bg-zinc-100 dark:hover:bg-zinc-900" 
            : "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-lg hover:bg-white dark:hover:bg-zinc-950"
        )}
        title={isExpanded ? "Collapse Toolbar" : "Expand Toolbar"}
      >
        {isExpanded ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex flex-col items-center w-full gap-3 overflow-y-auto scrollbar-none"
          >
            <div className="flex flex-col gap-1.5">
              {tools.map((tool) => (
                <Button
                  key={tool.id}
                  variant={currentTool === tool.id ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setTool(tool.id as Tool)}
                  title={tool.label}
                  className={cn(
                    "w-10 h-10 rounded-xl transition-all",
                    currentTool === tool.id && "shadow-lg scale-110"
                  )}
                >
                  <tool.icon className="w-5 h-5" />
                </Button>
              ))}
            </div>

            {(currentTool === 'select' || currentTool === 'magic-cut') && (
              <>
                <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-blue-500" title="Selection Tolerance">
                      <div className="relative">
                        <Wand2 className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 text-[8px] text-white">
                          T
                        </span>
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="center" className="w-64 p-4 ml-2">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Tolerance</span>
                        <span className="text-xs font-mono text-zinc-500">{selectionTolerance}%</span>
                      </div>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[selectionTolerance]}
                        onValueChange={(v) => {
                          if (Array.isArray(v)) setSelectionTolerance(v[0]);
                          else if (typeof v === 'number') setSelectionTolerance(v);
                        }}
                        className="flex-1"
                      />
                      <p className="text-[10px] text-zinc-400">
                        Higher values select more similar colors.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}

            {hasSelection && (
              <>
                <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                <div className="flex flex-col gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onInvertSelection}
                    title="Invert Selection"
                    className="w-10 h-10 rounded-xl text-blue-500 hover:bg-blue-50"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onCopySelection}
                    title="Copy Selection to New Layer"
                    className="w-10 h-10 rounded-xl text-green-500 hover:bg-green-50"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onDeleteSelection}
                    title="Delete Selection"
                    className="w-10 h-10 rounded-xl text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClearSelection}
                    title="Clear Selection"
                    className="w-10 h-10 rounded-xl text-zinc-400"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}

            <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

            <div className="flex flex-col gap-1.5 items-center py-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl" title="Zoom">
                    <Search className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="right" align="center" className="w-64 p-4 ml-2">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Zoom</span>
                      <span className="text-xs font-mono text-zinc-500">{Math.round(zoom * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                        onClick={() => setZoom(Math.max(0.2, zoom - 0.01))}
                      >
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <Slider
                        min={0.2}
                        max={2}
                        step={0.01}
                        value={[zoom]}
                        onValueChange={(v) => {
                          if (Array.isArray(v)) setZoom(v[0]);
                          else if (typeof v === 'number') setZoom(v);
                        }}
                        className="flex-1"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                        onClick={() => setZoom(Math.min(2, zoom + 0.01))}
                      >
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>20%</span>
                      <span>100%</span>
                      <span>200%</span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="w-full h-px bg-zinc-200 dark:border-zinc-800 my-1" />

            <div className="flex flex-col gap-1.5">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onUndo} 
                disabled={!canUndo}
                title="Undo"
                className="w-10 h-10 rounded-xl"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onRedo} 
                disabled={!canRedo}
                title="Redo"
                className="w-10 h-10 rounded-xl"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>

            <div className="w-full h-px bg-zinc-200 dark:border-zinc-800 my-1" />

            <div className="flex flex-col gap-1.5">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClear}
                title="Clear Canvas"
                className="w-10 h-10 rounded-xl text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onDownload}
                title="Download PNG"
                className="w-10 h-10 rounded-xl text-primary hover:bg-primary/10"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
