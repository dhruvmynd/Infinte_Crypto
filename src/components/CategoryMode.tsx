import React, { useState, useEffect } from 'react';
import { DraggableItem } from '../types';

interface CategoryTarget {
  id: string;
  finalWord: string;
  element1: string | null;
  element2: string | null;
  icon: string;
  combinedFrom: string[];
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  isHovering1: boolean;
  isHovering2: boolean;
  completed: boolean;
}

interface CategoryModeProps {
  containerRef: React.RefObject<HTMLDivElement>;
  onDrop: (item: DraggableItem, target: CategoryTarget) => void;
  isTimerActive: boolean;
  isTimeUp: boolean;
  onScoreChange: (score: number, total: number) => void;
}

const DEFAULT_TARGETS = [
  {
    id: 'target-1',
    finalWord: 'Steam',
    element1: null,
    element2: null,
    icon: '♨️',
    combinedFrom: ['Water', 'Fire']
  },
  {
    id: 'target-2',
    finalWord: 'Magma',
    element1: null,
    element2: null,
    icon: '🌋',
    combinedFrom: ['Fire', 'Earth']
  },
  {
    id: 'target-3',
    finalWord: 'Mud',
    element1: null,
    element2: null,
    icon: '💧',
    combinedFrom: ['Water', 'Earth']
  },
  {
    id: 'target-4',
    finalWord: 'CryptoMine',
    element1: null,
    element2: null,
    icon: '⛏️',
    combinedFrom: ['Bitcoin', 'Earth']
  }
];

export function CategoryMode({ containerRef, onDrop, isTimerActive, isTimeUp, onScoreChange }: CategoryModeProps) {
  const [targets, setTargets] = useState<CategoryTarget[]>([]);
  const [score, setScore] = useState(0);
  const animationFrameRef = React.useRef<number>();

  useEffect(() => {
    const initializeTargets = () => {
      const containerWidth = containerRef.current?.clientWidth || 800;
      const containerHeight = containerRef.current?.clientHeight || 600;
      const padding = 100;

      return DEFAULT_TARGETS.map(target => ({
        ...target,
        position: {
          x: padding + Math.random() * (containerWidth - padding * 2),
          y: padding + Math.random() * (containerHeight - padding * 2)
        },
        velocity: {
          x: (Math.random() - 0.5) * 0.5,
          y: (Math.random() - 0.5) * 0.5
        },
        isHovering1: false,
        isHovering2: false,
        completed: false
      }));
    };

    setTargets(initializeTargets());
  }, [containerRef]);

  useEffect(() => {
    const animate = () => {
      const containerWidth = containerRef.current?.clientWidth || 800;
      const containerHeight = containerRef.current?.clientHeight || 600;
      const padding = 50;

      setTargets(prev => prev.map(target => {
        let { x, y } = target.position;
        let { x: vx, y: vy } = target.velocity;

        // Update position
        x += vx;
        y += vy;

        // Bounce off walls with slight randomization
        if (x <= padding || x >= containerWidth - padding) {
          vx *= -1;
          vx += (Math.random() - 0.5) * 0.1;
          x = x <= padding ? padding : containerWidth - padding;
        }
        if (y <= padding || y >= containerHeight - padding) {
          vy *= -1;
          vy += (Math.random() - 0.5) * 0.1;
          y = y <= padding ? padding : containerHeight - padding;
        }

        // Keep velocity in bounds
        vx = Math.max(-1, Math.min(1, vx));
        vy = Math.max(-1, Math.min(1, vy));

        return {
          ...target,
          position: { x, y },
          velocity: { x: vx, y: vy }
        };
      }));

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (!isTimeUp) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [containerRef, isTimeUp]);

  useEffect(() => {
    // Count completed targets
    const completedCount = targets.filter(target => 
      target.element1 && target.element2
    ).length;
    
    // Update score
    setScore(completedCount);
    
    // Notify parent component about score change
    onScoreChange(completedCount, targets.length);
  }, [targets, onScoreChange]);

  const handleDragOver = (e: React.DragEvent, target: CategoryTarget, slotIndex: 1 | 2) => {
    e.preventDefault();
    
    const itemId = e.dataTransfer.getData('text/plain');
    const item = document.querySelector(`[data-item-id="${itemId}"]`) as HTMLElement;
    if (!item) return;

    const itemName = item.getAttribute('data-item-name');
    if (!itemName) return;

    // Check if the dragged item is valid for this slot
    const isValidDrop = target.combinedFrom[slotIndex - 1] === itemName;
    
    if (isValidDrop) {
      e.dataTransfer.dropEffect = 'copy';
      e.currentTarget.classList.add('bg-green-500/20');
    } else {
      e.dataTransfer.dropEffect = 'none';
      e.currentTarget.classList.add('bg-red-500/20');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-green-500/20', 'bg-red-500/20');
  };

  const handleDrop = (e: React.DragEvent, target: CategoryTarget, slotIndex: 1 | 2) => {
    if (!isTimerActive || isTimeUp) return;

    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('bg-green-500/20', 'bg-red-500/20');
    
    const itemId = e.dataTransfer.getData('text/plain');
    const item = document.querySelector(`[data-item-id="${itemId}"]`) as HTMLElement;
    if (!item) return;

    const itemName = item.getAttribute('data-item-name');
    if (!itemName) return;

    // Only allow dropping if the item matches the required element
    if (target.combinedFrom[slotIndex - 1] !== itemName) {
      return;
    }

    // Update the target with the dropped element
    setTargets(prev => prev.map(t => {
      if (t.id === target.id) {
        const newTarget = {
          ...t,
          element1: slotIndex === 1 ? itemName : t.element1,
          element2: slotIndex === 2 ? itemName : t.element2
        };

        // Check if both elements are correct and mark as completed
        const isCompleted = newTarget.element1 && newTarget.element2;
        
        return {
          ...newTarget,
          completed: isCompleted
        };
      }
      return t;
    }));
  };

  const handleMouseEnter = (targetId: string, slotIndex: 1 | 2) => {
    setTargets(prev => prev.map(t => {
      if (t.id === targetId) {
        return {
          ...t,
          isHovering1: slotIndex === 1 ? true : t.isHovering1,
          isHovering2: slotIndex === 2 ? true : t.isHovering2
        };
      }
      return t;
    }));
  };

  const handleMouseLeave = (targetId: string, slotIndex: 1 | 2) => {
    setTargets(prev => prev.map(t => {
      if (t.id === targetId) {
        return {
          ...t,
          isHovering1: slotIndex === 1 ? false : t.isHovering1,
          isHovering2: slotIndex === 2 ? false : t.isHovering2
        };
      }
      return t;
    }));
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {targets.map(target => (
        <div
          key={target.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
          style={{
            left: target.position.x,
            top: target.position.y
          }}
        >
          <div className="relative">
            {/* Glow effect */}
            <div 
              className={`absolute inset-0 blur-xl rounded-full ${
                target.completed 
                  ? 'bg-green-500/20' 
                  : 'bg-purple-500/10'
              }`}
              style={{ width: '200px', height: '200px', transform: 'translate(-50%, -50%)' }}
            />
            
            {/* Target container */}
            <div className={`relative backdrop-blur-sm border rounded-xl p-6 shadow-lg ${
              target.completed 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-white/10 border-purple-500/20'
            }`}>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-2xl">{target.icon}</span>
                <span className="text-xl font-medium">{target.finalWord}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div 
                  className={`w-24 h-12 rounded-lg border-2 ${
                    target.element1 
                      ? 'border-green-500 bg-green-500/10' 
                      : 'border-purple-500/50 border-dashed'
                  } flex items-center justify-center transition-colors`}
                  onDragOver={(e) => handleDragOver(e, target, 1)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, target, 1)}
                  onMouseEnter={() => handleMouseEnter(target.id, 1)}
                  onMouseLeave={() => handleMouseLeave(target.id, 1)}
                >
                  {target.element1 || (target.isHovering1 ? target.combinedFrom[0] : '?')}
                </div>
                
                <span className="text-lg">+</span>
                
                <div 
                  className={`w-24 h-12 rounded-lg border-2 ${
                    target.element2 
                      ? 'border-green-500 bg-green-500/10' 
                      : 'border-purple-500/50 border-dashed'
                  } flex items-center justify-center transition-colors`}
                  onDragOver={(e) => handleDragOver(e, target, 2)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, target, 2)}
                  onMouseEnter={() => handleMouseEnter(target.id, 2)}
                  onMouseLeave={() => handleMouseLeave(target.id, 2)}
                >
                  {target.element2 || (target.isHovering2 ? target.combinedFrom[1] : '?')}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}