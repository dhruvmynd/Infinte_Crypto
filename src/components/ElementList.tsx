import React, { useState } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
import { DraggableItem } from '../types';

interface ElementListProps {
  items: DraggableItem[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onDragStart: (e: React.DragEvent, item: DraggableItem) => void;
  deleteMode: boolean;
  onDelete: (itemId: string) => void;
}

export function ElementList({ 
  items, 
  searchTerm, 
  onSearchChange, 
  onDragStart,
  deleteMode,
  onDelete
}: ElementListProps) {
  const [selectedElement, setSelectedElement] = useState<DraggableItem | null>(null);

  const baseElements = items.filter(item => item.isBaseElement);
  const generatedElements = items.filter(item => 
    !item.isBaseElement && 
    item.position && 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBaseElements = baseElements.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRelatedCombinations = (element: DraggableItem) => {
    return items.filter(item => 
      !item.isBaseElement && 
      item.position &&
      (item.combinedFrom?.includes(element.name) || false)
    );
  };

  const handleElementClick = (element: DraggableItem) => {
    if (deleteMode) return;
    setSelectedElement(selectedElement?.id === element.id ? null : element);
  };

  const renderOriginPath = (combination: DraggableItem) => {
    if (!combination.combinedFrom) return null;
    
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center flex-wrap gap-1">
        {combination.combinedFrom.map((element, index) => (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight size={12} className="inline" />}
            <span className="bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 rounded">
              {element}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="w-96 shrink-0 bg-gray-100 dark:bg-gray-900 p-4 rounded-lg flex flex-col h-full transition-colors duration-200">
      <h2 className="text-xl font-bold mb-4">Elements</h2>
      <div className="relative mb-4 flex-shrink-0">
        <input
          type="text"
          placeholder="Search elements..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-200"
        />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
      </div>

      {selectedElement && (
        <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Combinations with {selectedElement.name}</h3>
            <button
              onClick={() => setSelectedElement(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={16} />
            </button>
          </div>
          <div className="space-y-2">
            {getRelatedCombinations(selectedElement).map(combination => (
              <div
                key={combination.id}
                className="p-2 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{combination.icon}</span>
                  <span className="text-sm font-medium">{combination.name}</span>
                </div>
                {renderOriginPath(combination)}
              </div>
            ))}
          </div>
          {getRelatedCombinations(selectedElement).length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No combinations found yet. Try combining with other elements!
            </p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
        {/* Base Elements Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Base Elements</h3>
          <div className="grid grid-cols-2 gap-2">
            {filteredBaseElements.map(item => (
              <div
                key={item.id}
                className={`group relative flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 ${
                  deleteMode ? 'pointer-events-none opacity-50' : ''
                } ${selectedElement?.id === item.id ? 'ring-2 ring-purple-500' : ''}`}
                draggable={!deleteMode}
                onDragStart={(e) => onDragStart(e, item)}
                onClick={() => handleElementClick(item)}
              >
                <span className="text-xl">{typeof item.icon === 'string' ? item.icon : '💫'}</span>
                <span className="flex-1 text-sm truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Generated Elements Section */}
        {generatedElements.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Generated Elements</h3>
            <div className="grid grid-cols-2 gap-2">
              {generatedElements.map(item => (
                <div
                  key={item.id}
                  className="group relative space-y-1"
                >
                  <div
                    className={`flex items-center gap-2 p-2 rounded cursor-move hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 ${
                      deleteMode ? 'pointer-events-none opacity-50' : ''
                    }`}
                    draggable={!deleteMode}
                    onDragStart={(e) => onDragStart(e, item)}
                  >
                    <span className="text-xl">{typeof item.icon === 'string' ? item.icon : '💫'}</span>
                    <span className="flex-1 text-sm truncate">{item.name}</span>
                  </div>
                  {renderOriginPath(item)}
                </div>
              ))}
            </div>
          </div>
        )}

        {searchTerm && filteredBaseElements.length === 0 && generatedElements.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">
            No elements found matching "{searchTerm}"
          </p>
        )}
      </div>
    </div>
  );
}