import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useTokens } from '../hooks/useTokens';

interface TokenDisplayProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TokenDisplay({ 
  className = "", 
  showLabel = true,
  size = 'md'
}: TokenDisplayProps) {
  const { tokenBalance, isLoading } = useTokens();
  
  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1.5',
    lg: 'text-base gap-2'
  };
  
  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20
  };
  
  return (
    <div className={`flex items-center ${sizeClasses[size]} ${className}`}>
      {showLabel && <span className="font-medium">Tokens:</span>}
      
      <div className="flex items-center gap-1">
        <Sparkles size={iconSizes[size]} className="text-purple-500" />
        
        {isLoading ? (
          <Loader2 size={iconSizes[size]} className="animate-spin text-purple-500" />
        ) : (
          <span className="font-bold">{tokenBalance}</span>
        )}
      </div>
    </div>
  );
}