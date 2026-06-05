import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sparkles, Image as ImageIcon, Loader2, Layers as LayersIcon, Plus, Eye, EyeOff, Trash2, GripVertical, ChevronDown, ChevronUp, Palette, PanelRightClose, PanelRightOpen, Menu, Maximize2 } from 'lucide-react';
import { RESOLUTIONS, DEFAULT_PALETTE, Layer } from '../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'motion/react';

interface SidebarProps {
  grid: (string | null)[][];
  resolution: number;
  setResolution: (res: number) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  onGenerate: (prompt: string) => void;
  onImageUpload: (file: File, prompt: string) => void;
  isGenerating: boolean;
  palette: string[];
  layers: Layer[];
  setLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
  activeLayerId: string;
  setActiveLayerId: (id: string) => void;
}

type SectionId = 'resolution' | 'layers' | 'preview' | 'ai' | 'image' | 'palette';

interface SidebarSection {
  id: SectionId;
  title: string;
  icon: React.ReactNode;
}

const SortableSection = ({ 
  section, 
  isOpen, 
  onToggle, 
  children,
  key // Add key to props to satisfy TS
}: { 
  section: SidebarSection; 
  isOpen: boolean; 
  onToggle: () => void;
  children: React.ReactNode;
  key?: React.Key;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 transition-colors",
        isDragging && "shadow-2xl border-primary/50 ring-1 ring-primary/20"
      )}
    >
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 group"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div 
            {...attributes} 
            {...listeners} 
            className="p-1 text-zinc-400 hover:text-zinc-600 cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            {section.icon}
            <h3 className="text-sm font-bold uppercase tracking-wider">{section.title}</h3>
          </div>
        </div>
        <div className="text-zinc-400 group-hover:text-zinc-600">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SortableLayerItem = ({ 
  layer, 
  isActive, 
  onSelect, 
  onToggleVisibility, 
  onDelete,
  id
}: { 
  layer: Layer; 
  isActive: boolean;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  id: string;
  key?: React.Key;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
        isActive 
          ? 'bg-primary/10 border-primary border-2' 
          : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
      onClick={() => onSelect(layer.id)}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-zinc-400 hover:text-zinc-600">
        <GripVertical className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{layer.name}</p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(layer.id);
          }}
        >
          {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-400" />}
        </Button>
        {layer.id !== 'base' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(layer.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

const getRepresentativeColors = (grid: (string | null)[][]) => {
  const counts: Record<string, number> = {};
  grid.flat().forEach(color => {
    if (color && color.toLowerCase() !== '#ffffff') {
      counts[color] = (counts[color] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([color]) => color);
};

export const Sidebar: React.FC<SidebarProps> = ({
  grid,
  resolution,
  setResolution,
  selectedColor,
  setSelectedColor,
  onGenerate,
  onImageUpload,
  isGenerating,
  palette,
  layers,
  setLayers,
  activeLayerId,
  setActiveLayerId,
}) => {
  const [prompt, setPrompt] = useState('');
  const [uploadPrompt, setUploadPrompt] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    resolution: true,
    layers: true,
    preview: true,
    ai: true,
    image: false,
    palette: true
  });
  const [sections, setSections] = useState<SidebarSection[]>([
    { id: 'resolution', title: 'Resolution', icon: <Maximize2 className="w-4 h-4" /> },
    { id: 'layers', title: 'Layers', icon: <LayersIcon className="w-4 h-4" /> },
    { id: 'preview', title: 'Preview', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'ai', title: 'AI Generation', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'image', title: 'Image Reference', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'palette', title: 'Palette', icon: <Palette className="w-4 h-4" /> },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleSection = (id: SectionId) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLayerDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setLayers((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addLayer = () => {
    const newId = `layer-${Date.now()}`;
    const newLayer: Layer = {
      id: newId,
      name: `Layer ${layers.length}`,
      grid: Array(resolution).fill(null).map(() => Array(resolution).fill(null)),
      visible: true
    };
    setLayers([...layers, newLayer]);
    setActiveLayerId(newId);
  };

  const toggleVisibility = (id: string) => {
    setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const deleteLayer = (id: string) => {
    if (id === 'base') return;
    const newLayers = layers.filter(l => l.id !== id);
    setLayers(newLayers);
    if (activeLayerId === id) {
      setActiveLayerId(newLayers[newLayers.length - 1].id);
    }
  };

  const representativeColors = getRepresentativeColors(grid);
  const displayPalette = [...new Set([...representativeColors, ...palette])].slice(0, 18);

  const isLayerEmpty = grid.flat().every(c => c === null || c.toLowerCase() === '#ffffff');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file, uploadPrompt);
    }
  };

  const renderSectionContent = (id: SectionId) => {
    switch (id) {
      case 'resolution':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Select canvas resolution</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {RESOLUTIONS.map((res) => (
                <Button
                  key={res}
                  variant={resolution === res ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setResolution(res)}
                  className={cn(
                    "h-9 transition-all",
                    resolution === res && "shadow-lg shadow-primary/20"
                  )}
                >
                  {res}
                </Button>
              ))}
            </div>
          </div>
        );
      case 'layers':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Manage your layers</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={addLayer}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleLayerDragEnd}
              >
                <SortableContext 
                  items={layers.map(l => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {[...layers].reverse().map((layer) => (
                    <SortableLayerItem 
                      key={layer.id} 
                      id={layer.id}
                      layer={layer} 
                      isActive={activeLayerId === layer.id}
                      onSelect={setActiveLayerId}
                      onToggleVisibility={toggleVisibility}
                      onDelete={deleteLayer}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        );
      case 'preview':
        return (
          <div className="space-y-4">
            <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl p-4 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
              <div 
                className="shadow-lg bg-white relative"
                style={{ 
                  width: resolution, 
                  height: resolution,
                }}
              >
                {layers.map((layer) => (
                  layer.visible && (
                    <div 
                      key={layer.id}
                      className="absolute inset-0"
                      style={{ 
                        display: 'grid',
                        gridTemplateColumns: `repeat(${resolution}, 1px)`,
                        gridTemplateRows: `repeat(${resolution}, 1px)`,
                      }}
                    >
                      {layer.grid.map((row, y) => 
                        row.map((color, x) => (
                          color && (
                            <div 
                              key={`${x}-${y}`} 
                              style={{ backgroundColor: color, width: 1, height: 1 }} 
                            />
                          )
                        ))
                      )}
                    </div>
                  )
                ))}
              </div>
            </div>
            <p className="text-[10px] text-center text-zinc-400 uppercase tracking-widest">Actual Size</p>
          </div>
        );
      case 'ai':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Input 
                id="prompt"
                placeholder="e.g. A cute cat in a space suit"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
            <Button 
              className="w-full gap-2 shadow-lg shadow-primary/20" 
              onClick={() => onGenerate(prompt)}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isLayerEmpty ? 'Generate' : 'Edit with AI'}
            </Button>
          </div>
        );
      case 'image':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upload-prompt">Refinement Prompt (Optional)</Label>
              <Input 
                id="upload-prompt"
                placeholder="e.g. Make it look like GBA style"
                value={uploadPrompt}
                onChange={(e) => setUploadPrompt(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-upload" className="cursor-pointer block">
                <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-6 text-center hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all hover:border-primary/50 group">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-zinc-400 group-hover:text-primary transition-colors" />
                  <span className="text-sm text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">Click to upload image</span>
                </div>
              </Label>
              <Input 
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isGenerating}
              />
            </div>
          </div>
        );
      case 'palette':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-2">
              {displayPalette.map((color, i) => (
                <button
                  key={`${color}-${i}`}
                  className={`w-8 h-8 rounded-md border border-zinc-200 dark:border-zinc-800 transition-all hover:opacity-80 ${selectedColor === color ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
              {displayPalette.length < 12 && DEFAULT_PALETTE.slice(0, 12 - displayPalette.length).map((color, i) => (
                <button
                  key={`default-${i}`}
                  className={`w-8 h-8 rounded-md border border-zinc-200 dark:border-zinc-800 transition-all hover:opacity-80 ${selectedColor === color ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <Label htmlFor="custom-color" className="text-sm font-medium">Custom Color</Label>
              <Input 
                id="custom-color"
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-10 h-8 p-0 border-none bg-transparent cursor-pointer"
              />
              <span className="text-xs font-mono text-zinc-500 uppercase">{selectedColor}</span>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* Toggle Button for Mobile/Tablet and Desktop when closed */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed right-4 top-1/2 -translate-y-1/2 z-[60] w-10 h-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-xl flex items-center justify-center transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900",
          isOpen ? "lg:right-[320px] right-[280px]" : "right-4"
        )}
      >
        {isOpen ? <PanelRightClose className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[50] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.div 
        initial={false}
        animate={{ 
          x: isOpen ? 0 : '100%',
          width: isOpen ? (window.innerWidth < 1024 ? 280 : 320) : 0
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed lg:relative right-0 top-0 h-full bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 z-[55] flex flex-col",
          !isOpen && "pointer-events-none"
        )}
      >
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={sections.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  isOpen={openSections[section.id]}
                  onToggle={() => toggleSection(section.id)}
                >
                  {renderSectionContent(section.id)}
                </SortableSection>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </motion.div>
    </>
  );
};
