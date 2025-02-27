import React, { useState } from 'react';
import { Search, X, Play, Timer, ShoppingBag, Lightbulb, Sparkles, Clock, Target, Users, Gamepad2, Loader2 } from 'lucide-react';
import { DraggableItem } from '../types';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { useRarity } from '../hooks/useRarity';
import { useLanguage } from '../hooks/useLanguage';
import { usePurchases } from '../hooks/usePurchases';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../constants';
import { Timer as TimerComponent } from './Timer';

interface ElementListProps {
  items: DraggableItem[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onDragStart: (e: React.DragEvent, item: DraggableItem) => void;
  deleteMode: boolean;
  onDelete: (itemId: string) => void;
  walletAddress?: string | null;
  selectedMode: 'Basic' | 'Timed' | 'Category' | '1v1';
  onModeChange: (mode: 'Basic' | 'Timed' | 'Category' | '1v1') => void;
  onStartChallenge?: () => void;
  isTimerActive?: boolean;
  isTimeUp?: boolean;
  score?: number;
  totalTargets?: number;
  onElementClick: (item: DraggableItem) => void;
  onBuyWords: () => void;
  onGetTokens: () => void;
}

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  zh: '中文'
};

const MODES = [
  { id: 'Basic', icon: Gamepad2, label: 'Basic Mode' },
  { id: 'Timed', icon: Clock, label: 'Timed Mode' },
  { id: 'Category', icon: Target, label: 'Category Mode' },
  { id: '1v1', icon: Users, label: '1v1 Mode' }
] as const;

export default function ElementList({ 
  items, 
  searchTerm, 
  onSearchChange, 
  onDragStart,
  deleteMode,
  onDelete,
  walletAddress,
  selectedMode,
  onModeChange,
  onStartChallenge,
  isTimerActive,
  isTimeUp,
  score,
  totalTargets,
  onElementClick,
  onBuyWords,
  onGetTokens
}: ElementListProps) {
  const [selectedElement, setSelectedElement] = useState<DraggableItem | null>(null);
  const { profile } = useProfile();
  const { user } = useAuth();
  const { calculateRarity } = useRarity();
  const { currentLanguage, setCurrentLanguage, translate } = useLanguage();
  const { totals } = usePurchases();

  const getElementName = (item: DraggableItem) => {
    return item.translations?.[currentLanguage] || item.name;
  };

  // Filter elements
  const baseElements = items.filter(item => item.isBaseElement);
  
  // Get unique generated elements by name
  const generatedElements = items.reduce<DraggableItem[]>((acc, item) => {
    if (!item.isBaseElement && item.combinedFrom?.length >= 2) {
      // Check if we already have this element name
      const exists = acc.some(existing => existing.name === item.name);
      if (!exists) {
        acc.push(item);
      }
    }
    return acc;
  }, []);

  const filteredBaseElements = baseElements.filter(item => 
    getElementName(item).toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGeneratedElements = generatedElements.filter(item => 
    getElementName(item).toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleElementClick = (element: DraggableItem) => {
    if (deleteMode || selectedMode === 'Category') return;
    setSelectedElement(selectedElement?.id === element.id ? null : element);
    onElementClick(element);
  };

  const renderRarityIndicator = (name: string) => {
    const rarity = calculateRarity(name);
    const color = rarity > 80 ? 'bg-red-500' : rarity > 50 ? 'bg-yellow-500' : 'bg-green-500';
    
    return (
      <div className="absolute -top-1 -right-1 flex items-center gap-1">
        <span className="text-xs font-medium bg-gray-800/80 text-white px-1.5 py-0.5 rounded">
          {rarity}%
        </span>
        <div className={`w-2 h-2 rounded-full ${color}`} />
      </div>
    );
  };

  const renderElement = (item: DraggableItem) => (
    <div
      key={item.id}
      className="group relative space-y-1"
    >
      <div
        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 ${
          deleteMode || (selectedMode === 'Category' && !isTimerActive) ? 'pointer-events-none opacity-50' : ''
        } ${selectedElement?.id === item.id ? 'ring-2 ring-purple-500' : ''}`}
        draggable={!deleteMode && !(selectedMode === 'Category' && !isTimerActive)}
        onDragStart={(e) => onDragStart(e, item)}
        onClick={() => handleElementClick(item)}
        data-item-id={item.id}
        data-item-name={item.name}
      >
        <span className="text-xl min-w-[28px] flex justify-center">{typeof item.icon === 'string' ? item.icon : '💫'}</span>
        <span className="flex-1 text-sm font-medium truncate">{getElementName(item)}</span>
        {!item.isBaseElement && renderRarityIndicator(item.name)}
      </div>
    </div>
  );

  return (
    <div className="w-96 shrink-0 bg-gray-100 dark:bg-gray-900 p-4 rounded-lg flex flex-col h-full transition-colors duration-200">
      {/* Game Mode Selection */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {MODES.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onModeChange(id)}
            className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${
              id === selectedMode
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={label}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>

      {/* Timer/Challenge Section */}
      {(selectedMode === 'Category' || selectedMode === 'Timed') && (
        <div className="mb-4">
          {!isTimerActive && !isTimeUp ? (
            <button
              onClick={onStartChallenge}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <Play size={16} />
              <span>Start Challenge</span>
            </button>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <TimerComponent
                initialTime={selectedMode === 'Timed' ? 120 : 60}
                onTimeEnd={() => {}}
                isActive={isTimerActive}
              />
              <div className="text-lg font-medium text-center">
                Score: {score} {selectedMode === 'Category' && `/ ${totalTargets}`}
              </div>
              {isTimeUp && (
                <div className="mt-2">
                  <div className="text-lg font-medium mb-2 text-center">Time's up!</div>
                  {selectedMode === 'Timed' && (
                    <div className="text-sm mb-2 text-center">Words Created: {totalTargets}</div>
                  )}
                  <button
                    onClick={onStartChallenge}
                    className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Language Selection */}
      <div className="mb-4">
        <div className="grid grid-cols-2 gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => lang === 'en' && setCurrentLanguage(lang)}
              disabled={lang !== 'en'}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentLanguage === lang
                  ? 'bg-blue-500 text-white'
                  : lang === 'en'
                  ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              {LANGUAGE_NAMES[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder={translate('searchElements')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-200"
        />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
      </div>

      {/* Elements Section */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
        {/* Base Elements */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">Base Elements</h3>
          <div className="grid grid-cols-2 gap-2">
            {filteredBaseElements.map(item => renderElement(item))}
          </div>
        </div>

        {/* Generated Elements */}
        {filteredGeneratedElements.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">Generated Elements</h3>
            <div className="grid grid-cols-2 gap-2">
              {filteredGeneratedElements.map(item => renderElement(item))}
            </div>
          </div>
        )}

        {searchTerm && filteredBaseElements.length === 0 && filteredGeneratedElements.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">
            {translate('noElementsFound')} "{searchTerm}"
          </p>
        )}

        {/* Power Ups Section */}
        <div className="pt-4">
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-1">
                <ShoppingBag className="w-6 h-6 text-yellow-500" />
              </div>
              <span className="text-xs text center">Word Packs</span>
              <span className="text-xs font-bold">
                {totals.isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  totals.words
                )}
              </span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-1">
                <Timer className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-xs text-center">Time</span>
              <span className="text-xs font-bold">2</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-1">
                <Lightbulb className="w-6 h-6 text-purple-500" />
              </div>
              <span className="text-xs text-center">Hint</span>
              <span className="text-xs font-bold">5</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mb-1">
                <Sparkles className="w-6 h-6 text-pink-500" />
              </div>
              <span className="text-xs text-center">Tokens</span>
              <span className="text-xs font-bold">
                {totals.isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  totals.tokens
                )}
              </span>
            </div>
          </div>

          <div className="mb-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span>30 Found</span>
              <span>20 Remaining</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onBuyWords}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Buy Words
            </button>
            <button
              onClick={onGetTokens}
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Get Tokens
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}