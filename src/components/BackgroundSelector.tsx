import React from 'react';
import { Palette } from 'lucide-react';
import { Background } from '../hooks/useBackgrounds';
import { useLanguage } from '../hooks/useLanguage';

interface BackgroundSelectorProps {
  backgrounds: Background[];
  selectedBackground: Background;
  onSelect: (background: Background) => void;
}

export function BackgroundSelector({ backgrounds, selectedBackground, onSelect }: BackgroundSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { translate } = useLanguage();

  return (
    <div className="absolute bottom-4 left-4 z-10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-gray-800/80 hover:bg-gray-700 rounded-full transition-colors"
        title={translate('changeBackground')}
      >
        <Palette className="w-5 h-5 text-white" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 min-w-[240px] backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
          <div className="space-y-1">
            {backgrounds.map(bg => (
              <button
                key={bg.id}
                onClick={() => {
                  onSelect(bg);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left rounded-md transition-colors ${
                  selectedBackground.id === bg.id
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="font-medium">{bg.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{bg.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}