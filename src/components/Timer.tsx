import React, { useRef, useEffect, useState } from 'react';

interface TimerProps {
  initialTime: number;
  onTimeEnd: () => void;
  isActive: boolean;
}

export function Timer({ initialTime, onTimeEnd, isActive }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const lastUpdateRef = useRef(0);
  const requestRef = useRef<number>();

  useEffect(() => {
    if (isActive) {
      setTimeLeft(initialTime);
      lastUpdateRef.current = Date.now();
      
      const animate = (time: number) => {
        const now = Date.now();
        const delta = now - lastUpdateRef.current;
        
        if (delta >= 1000) {
          const newTimeLeft = Math.max(0, timeLeft - 1);
          setTimeLeft(newTimeLeft);
          lastUpdateRef.current = now;
          
          if (newTimeLeft <= 0) {
            onTimeEnd();
            return;
          }
        }
        
        requestRef.current = requestAnimationFrame(animate);
      };
      
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      setTimeLeft(initialTime);
    }
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isActive, initialTime, onTimeEnd]);
  
  // Format time as MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  return (
    <div className="text-2xl font-bold text-center mb-4">
      {formattedTime}
    </div>
  );
}