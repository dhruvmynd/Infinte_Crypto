import React from 'react';
import { Trophy, Clock, Target, Users } from 'lucide-react';
import Gamepad2 from './Gamepad2';
import { useProfile } from '../hooks/useProfile';
import { usePurchases } from '../hooks/usePurchases';

interface ScoreDisplayProps {
  basicScore?: number;
  timedScore?: number;
  categoryScore?: number;
  oneVsOneScore?: number;
  className?: string;
}

export function ScoreDisplay({ 
  basicScore = 0, 
  timedScore = 0, 
  categoryScore = 0, 
  oneVsOneScore = 0,
  className = ""
}: ScoreDisplayProps) {
  const { profile } = useProfile();
  const { totals } = usePurchases();
  
  // Calculate total score across all modes
  const totalScore = basicScore + timedScore + categoryScore + oneVsOneScore;
  
  return (
    <div className={`bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Game Stats</h3>
        <div className="flex items-center gap-1 bg-purple-600 px-2 py-1 rounded-full">
          <Trophy size={16} className="text-white" />
          <span className="text-sm font-bold text-white">{totalScore}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Gamepad2 size={16} className="text-blue-400" />
          </div>
          <div>
            <div className="text-xs text-gray-400">Basic</div>
            <div className="text-sm font-medium text-white">{basicScore}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <Clock size={16} className="text-green-400" />
          </div>
          <div>
            <div className="text-xs text-gray-400">Timed</div>
            <div className="text-sm font-medium text-white">{timedScore}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Target size={16} className="text-yellow-400" />
          </div>
          <div>
            <div className="text-xs text-gray-400">Category</div>
            <div className="text-sm font-medium text-white">{categoryScore}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
            <Users size={16} className="text-red-400" />
          </div>
          <div>
            <div className="text-xs text-gray-400">1v1</div>
            <div className="text-sm font-medium text-white">{oneVsOneScore}</div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Total Score:</span>
          <span className="font-bold text-white">{totalScore}</span>
        </div>
      </div>
    </div>
  );
}