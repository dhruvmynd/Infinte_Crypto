import React, { useState } from 'react';
import { Volume2, VolumeX, Eraser, Trash2, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SoundEffects } from '../sounds';
import { useCanvas } from '../hooks/useCanvas';
import { useElementCombiner } from '../hooks/useElementCombiner';
import { ElementList } from '../components/ElementList';
import { DraggableItem } from '../types';
import { baseElements, COMBINATION_DISTANCE } from '../constants';
import { useAddress } from "@thirdweb-dev/react";

export function InfiniteCrypto() {
  const navigate = useNavigate();
  const [items, setItems] = useState<DraggableItem[]>(baseElements);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [deleteMode, setDeleteMode] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  
  const address = useAddress();
  const isDraggingRef = React.useRef(false);
  const dragStartPositionRef = React.useRef<{ x: number; y: number } | null>(null);
  const soundEffects = React.useRef<SoundEffects>();

  const { canvasRef, containerRef } = useCanvas(items, draggingItem);
  const {
    combining,
    combiningPosition,
    setCombining,
    setCombiningPosition,
    combinationInProgressRef,
    lastCombinationTimeRef,
    checkRateLimit,
    canCombine,
    getValidCombination
  } = useElementCombiner();

  React.useEffect(() => {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  React.useEffect(() => {
    soundEffects.current = new SoundEffects();
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
    if (soundEnabled && soundEffects.current) {
      soundEffects.current.playPickupSound();
    }
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    if (soundEffects.current) {
      soundEffects.current.setVolume(soundEnabled ? 0 : 0.2);
    }
  };

  const toggleDeleteMode = () => {
    setDeleteMode(!deleteMode);
    if (soundEnabled && soundEffects.current) {
      soundEffects.current.playPickupSound();
    }
  };

  const deleteElement = (itemId: string) => {
    const itemToDelete = items.find(item => item.id === itemId);
    if (itemToDelete && !itemToDelete.isBaseElement && itemToDelete.position) {
      if (soundEnabled && soundEffects.current) {
        soundEffects.current.playDropSound();
      }
      setItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const sweepBoard = () => {
    setItems(prev => prev.filter(item => !item.position || item.isBaseElement));
    if (soundEnabled && soundEffects.current) {
      soundEffects.current.playDropSound();
    }
  };

  const findOverlappingElement = (x: number, y: number, excludeId?: string): DraggableItem | null => {
    return items.find(item => {
      if (!item.position || item.id === excludeId) return false;
      const dx = x - item.position.x;
      const dy = y - item.position.y;
      return Math.sqrt(dx * dx + dy * dy) < COMBINATION_DISTANCE;
    }) || null;
  };

  const createDraggedInstance = (baseItem: DraggableItem, position: { x: number; y: number }) => {
    const now = Date.now();
    return {
      ...baseItem,
      id: `${baseItem.id}-${now}`,
      position,
      isBaseElement: false,
      connectedPoints: [],
      combinedFrom: [baseItem.name]
    };
  };

  const combineElements = async (element1: DraggableItem, element2: DraggableItem) => {
    if (combining || combinationInProgressRef.current) return;
    if (!canCombine(element1, element2)) return;
    if (!checkRateLimit()) {
      console.log('Rate limit reached, please wait before combining more elements');
      return;
    }

    setCombining(true);
    combinationInProgressRef.current = true;
    lastCombinationTimeRef.current = Date.now();

    if (element1.position && element2.position) {
      setCombiningPosition({
        x: (element1.position.x + element2.position.x) / 2,
        y: (element1.position.y + element2.position.y) / 2
      });
    }

    try {
      const { word: newElement, emoji } = await getValidCombination(element1.name, element2.name);
      
      const now = Date.now();
      const newId = `combined-${now}`;
      
      setItems(prev => {
        const updatedItems = prev.filter(item => 
          item.id !== element1.id && item.id !== element2.id
        );

        return [
          ...updatedItems,
          {
            id: newId,
            name: newElement,
            icon: emoji,
            position: element1.position,
            connectedPoints: [],
            lastCombined: now,
            combinedFrom: [...(element1.combinedFrom || [element1.name]), ...(element2.combinedFrom || [element2.name])]
          }
        ];
      });
    } catch (error) {
      console.error('Error combining elements:', error);
    } finally {
      setCombining(false);
      setCombiningPosition(null);
      setTimeout(() => {
        combinationInProgressRef.current = false;
      }, 2000);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: DraggableItem) => {
    if (deleteMode) return;
    e.dataTransfer.setData('text/plain', item.id);
    setDraggingItem(item.id);
    isDraggingRef.current = true;
    
    if (soundEnabled) {
      soundEffects.current?.playPickupSound();
    }
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      dragStartPositionRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (deleteMode) return;
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const baseItem = items.find(item => item.id === itemId);
    if (!baseItem) return;

    const overlappingElement = findOverlappingElement(x, y);

    if (overlappingElement) {
      if (soundEnabled) {
        soundEffects.current?.playCombineSound();
      }
      const draggedInstance = createDraggedInstance(baseItem, { x, y });
      setItems(prev => [...prev, draggedInstance]);
      combineElements(draggedInstance, overlappingElement);
    } else {
      if (soundEnabled) {
        soundEffects.current?.playDropSound();
      }
      if (baseItem.isBaseElement) {
        const newInstance = createDraggedInstance(baseItem, { x, y });
        setItems(prev => [...prev, newInstance]);
      } else {
        setItems(prev => 
          prev.map(item => 
            item.id === itemId 
              ? { ...item, position: { x, y }, connectedPoints: [] }
              : item
          )
        );
      }
    }

    setDraggingItem(null);
    isDraggingRef.current = false;
    dragStartPositionRef.current = null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (deleteMode || !isDraggingRef.current || !draggingItem) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setItems(prevItems =>
      prevItems.map(item =>
        item.id === draggingItem
          ? { ...item, position: { x, y } }
          : item
      )
    );
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (deleteMode) return;
    if (isDraggingRef.current && draggingItem) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const draggedItem = items.find(item => item.id === draggingItem);
      if (!draggedItem) return;

      const overlappingElement = findOverlappingElement(x, y, draggingItem);

      if (overlappingElement) {
        if (soundEnabled) {
          soundEffects.current?.playCombineSound();
        }
        combineElements(draggedItem, overlappingElement);
      }
    }

    setDraggingItem(null);
    isDraggingRef.current = false;
    dragStartPositionRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (deleteMode) {
      const clickedItem = items.find(item => {
        if (!item.position || item.isBaseElement) return false;
        const dx = x - item.position.x;
        const dy = y - item.position.y;
        return Math.sqrt(dx * dx + dy * dy) < 30;
      });

      if (clickedItem) {
        deleteElement(clickedItem.id);
        return;
      }
    } else {
      const clickedItem = items.find(item => {
        if (!item.position) return false;
        const dx = x - item.position.x;
        const dy = y - item.position.y;
        return Math.sqrt(dx * dx + dy * dy) < 30;
      });

      if (clickedItem) {
        if (soundEnabled) {
          soundEffects.current?.playPickupSound();
        }
        setDraggingItem(clickedItem.id);
        isDraggingRef.current = true;
        dragStartPositionRef.current = { x, y };
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white transition-colors duration-200">
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 bg-clip-text text-transparent">
          Infinite Crypto
        </h1>
      </div>
      
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={toggleTheme}
          className="p-2 bg-gray-800/80 hover:bg-gray-700 rounded-full transition-colors"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-yellow-400" />
          ) : (
            <Moon className="w-5 h-5 text-gray-300" />
          )}
        </button>
      </div>
      
      <div className="w-full h-screen p-4">
        <div className="flex h-[calc(100vh-2rem)] gap-4">
          <div ref={containerRef} className="flex-1 relative">
            <canvas
              ref={canvasRef}
              className={`w-full h-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg transition-colors duration-200 ${
                deleteMode ? 'cursor-pointer' : 'cursor-default'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseUp}
            />
            {combining && combiningPosition && (
              <div 
                className="combining-animation"
                style={{
                  left: `${combiningPosition.x}px`,
                  top: `${combiningPosition.y}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            )}
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                onClick={toggleDeleteMode}
                className={`p-2 rounded-full transition-colors ${
                  deleteMode ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-800/80 hover:bg-gray-700'
                }`}
                title={deleteMode ? "Exit delete mode" : "Enter delete mode"}
              >
                <Trash2 className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={sweepBoard}
                className="p-2 bg-gray-800/80 hover:bg-gray-700 rounded-full transition-colors"
                title="Clear board"
              >
                <Eraser className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={toggleSound}
                className="p-2 bg-gray-800/80 hover:bg-gray-700 rounded-full transition-colors"
                title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
              >
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-white" />
                ) : (
                  <VolumeX className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
          
          <ElementList
            items={items}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onDragStart={handleDragStart}
            deleteMode={deleteMode}
            onDelete={deleteElement}
            walletAddress={address}
          />
        </div>
      </div>
    </div>
  );
}