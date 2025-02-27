import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Eraser, Trash2, Sun, Moon, Book } from 'lucide-react';
import { SoundEffects } from '../sounds';
import { useCanvas } from '../hooks/useCanvas';
import { useElementCombiner } from '../hooks/useElementCombiner';
import { useBackgrounds } from '../hooks/useBackgrounds';
import { useGameStats } from '../hooks/useGameStats';
import { useUserElements } from '../hooks/useUserElements';
import ElementList from '../components/ElementList';
import { AuthHeader } from '../components/AuthHeader';
import { CategoryMode } from '../components/CategoryMode';
import { CheckoutModal } from '../components/CheckoutModal';
import { FeedbackButton } from '../components/FeedbackButton';
import { DraggableItem } from '../types';
import { baseElements, COMBINATION_DISTANCE } from '../constants';
import { useAddress } from "@thirdweb-dev/react";
import { useProfile } from '../hooks/useProfile';
import { useLanguage } from '../hooks/useLanguage';

function InfiniteCrypto() {
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
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutType, setCheckoutType] = useState<'words' | 'tokens'>('words');
  
  const address = useAddress();
  const { profile } = useProfile();
  const { currentLanguage } = useLanguage();
  const { gameStats, updateScore, incrementScore } = useGameStats();
  const { savedElements, saveUserElements, isLoading: elementsLoading } = useUserElements();
  const isDraggingRef = useRef(false);
  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  const soundEffects = useRef<SoundEffects>();
  const { backgrounds, selectedBackground, setSelectedBackground } = useBackgrounds();
  const [selectedMode, setSelectedMode] = useState<'Basic' | 'Timed' | 'Category' | '1v1'>('Basic');
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [score, setScore] = useState(0);
  const [totalGeneratedWords, setTotalGeneratedWords] = useState(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getElementName = (item: DraggableItem) => {
    return item.translations?.[currentLanguage] || item.name;
  };

  const { canvasRef, containerRef } = useCanvas(items, draggingItem, getElementName);

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

  // Load saved elements when user logs in
  useEffect(() => {
    if (!elementsLoading && savedElements.length > 0) {
      // Merge base elements with saved elements
      const mergedItems = [...baseElements];
      
      // Add saved elements that don't already exist
      savedElements.forEach(savedElement => {
        const exists = mergedItems.some(item => 
          item.name === savedElement.name && !item.isBaseElement
        );
        
        if (!exists) {
          // Reset position to null so they appear in the list
          mergedItems.push({
            ...savedElement,
            position: null
          });
        }
      });
      
      setItems(mergedItems);
    }
  }, [savedElements, elementsLoading]);

  // Save elements when they change
  useEffect(() => {
    // Debounce saving to avoid too many requests
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    if (profile?.id && items.length > baseElements.length) {
      saveTimeoutRef.current = setTimeout(() => {
        saveUserElements(items);
      }, 2000); // Save after 2 seconds of inactivity
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [items, profile?.id, saveUserElements]);

  useEffect(() => {
    soundEffects.current = new SoundEffects();
  }, []);

  useEffect(() => {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Clear non-base elements when switching to Category mode
  useEffect(() => {
    if (selectedMode === 'Category' || selectedMode === 'Timed') {
      setItems(prev => prev.filter(item => item.isBaseElement));
      setDraggingItem(null);
      isDraggingRef.current = false;
      dragStartPositionRef.current = null;
      setScore(0);
      setTotalGeneratedWords(0);
      setIsTimerActive(false);
      setIsTimeUp(false);
    }
  }, [selectedMode]);

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
    setItems(prev => prev.map(item => 
      item.isBaseElement ? item : { ...item, position: null }
    ));
    if (soundEnabled && soundEffects.current) {
      soundEffects.current.playDropSound();
    }
  };

  const handleStartChallenge = () => {
    setIsTimerActive(true);
    setIsTimeUp(false);
    setScore(0);
    setTotalGeneratedWords(0);
    setItems(prev => prev.filter(item => item.isBaseElement));
  };

  const handleTimeEnd = () => {
    setIsTimeUp(true);
    setIsTimerActive(false);
    
    // Update game stats when time is up
    if (selectedMode === 'Timed') {
      updateScore('timed', totalGeneratedWords);
    } else if (selectedMode === 'Category') {
      updateScore('category', score);
    }
  };

  // Handle clicking on elements in the list
  const handleElementClick = (item: DraggableItem) => {
    if (deleteMode || selectedMode === 'Category') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Place the element in the center of the visible area
    const x = rect.width / 2;
    const y = rect.height / 2;

    if (item.isBaseElement) {
      const newInstance = createDraggedInstance(item, { x, y });
      setItems(prev => [...prev, newInstance]);
      if (soundEnabled) {
        soundEffects.current?.playDropSound();
      }
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
      combinedFrom: [baseItem.name],
      translations: baseItem.translations
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
      const { word: newElement, emoji, translations, rarity, domain } = await getValidCombination(element1.name, element2.name);
      
      const now = Date.now();
      const newId = `combined-${now}`;
      
      // Update items - keep the original elements but remove their positions
      setItems(prev => {
        const updatedItems = prev.map(item => {
          if (item.id === element1.id || item.id === element2.id) {
            return { ...item, position: null };
          }
          return item;
        });

        return [
          ...updatedItems,
          {
            id: newId,
            name: newElement,
            translations,
            icon: emoji,
            position: element1.position,
            connectedPoints: [],
            lastCombined: now,
            combinedFrom: [...(element1.combinedFrom || [element1.name]), ...(element2.combinedFrom || [element2.name])],
            rarity,
            domain
          }
        ];
      });

      // Update game stats based on the current mode
      if (selectedMode === 'Basic') {
        incrementScore('basic');
      } else if (selectedMode === 'Timed' && isTimerActive) {
        setScore(prev => prev + 1);
        setTotalGeneratedWords(prev => prev + 1);
      }

      if (soundEnabled && soundEffects.current) {
        soundEffects.current.playCombineSound();
      }
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
    if (deleteMode || selectedMode === 'Category') return;
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
    if (deleteMode || !isDraggingRef.current || !draggingItem || selectedMode === 'Category') return;

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
    if (deleteMode || !isDraggingRef.current || !draggingItem || selectedMode === 'Category') return;

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
    } else {
      if (soundEnabled) {
        soundEffects.current?.playDropSound();
      }
      setItems(prev => 
        prev.map(item => 
          item.id === draggingItem 
            ? { ...item, position: { x, y }, connectedPoints: [] }
            : item
        )
      );
    }

    setDraggingItem(null);
    isDraggingRef.current = false;
    dragStartPositionRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectedMode === 'Category') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (deleteMode) {
      const clickedItem = items.find(item => {
        if (!item.position || item.isBaseElement) return false;
        const dx = x - item.position.x;
        const dy = y - item.position.y;
        return Math.sqrt(dx * dx + dy * dy) < COMBINATION_DISTANCE;
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
        return Math.sqrt(dx * dx + dy * dy) < COMBINATION_DISTANCE;
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

  const handleBuyWords = () => {
    setCheckoutType('words');
    setIsCheckoutOpen(true);
  };

  const handleGetTokens = () => {
    setCheckoutType('tokens');
    setIsCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white transition-colors duration-200">
      <div className="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center h-16">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 bg-clip-text text-transparent pl-4">
            Infinite Ideas
          </h1>
          <div className="flex-1 flex items-center justify-center">
            <a
              href="https://jays-personal-organization-1.gitbook.io/infinite-ideas"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors text-sm"
            >
              <Book size={16} />
              <span>Documentation</span>
            </a>
          </div>
          <div className="pr-4">
            <AuthHeader />
          </div>
        </div>
      </div>

      <div className="w-full h-[calc(100vh-4rem)] p-4">
        <div className="flex h-full gap-4">
          <div ref={containerRef} className="flex-1 relative">
            <button
              onClick={toggleTheme}
              className="absolute top-4 right-4 p-2 bg-gray-800/80 hover:bg-gray-700 rounded-full transition-colors z-10"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-white" />
              ) : (
                <Moon className="w-5 h-5 text-white" />
              )}
            </button>

            <canvas
              ref={canvasRef}
              className={`w-full h-full ${selectedBackground.className} border border-gray-200 dark:border-gray-800 rounded-lg transition-colors duration-200 ${
                deleteMode ? 'cursor-pointer' : 'cursor-default'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => selectedMode !== 'Category' && e.preventDefault()}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseUp}
            />

            {selectedMode === 'Category' && (
              <CategoryMode 
                containerRef={containerRef}
                onDrop={() => {}}
                isTimerActive={isTimerActive}
                isTimeUp={isTimeUp}
                onScoreChange={setScore}
              />
            )}

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

            <div className="absolute bottom-4 left-4 flex gap-2">
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
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
            onStartChallenge={handleStartChallenge}
            isTimerActive={isTimerActive}
            isTimeUp={isTimeUp}
            score={score}
            totalTargets={totalGeneratedWords}
            onElementClick={handleElementClick}
            onBuyWords={handleBuyWords}
            onGetTokens={handleGetTokens}
            gameStats={gameStats}
          />
        </div>
      </div>
      
      <FeedbackButton />

      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        type={checkoutType}
      />
    </div>
  );
}

export default InfiniteCrypto;