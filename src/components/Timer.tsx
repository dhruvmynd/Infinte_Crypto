import React, { useRef, useEffect } from 'react';

interface TimerProps {
  initialTime: number;
  onTimeEnd: () => void;
  isActive: boolean;
}

export function Timer({ initialTime, onTimeEnd, isActive }: TimerProps) {
  const timeLeftRef = useRef(initialTime);
  const lastUpdateRef = useRef(0);
  const requestRef = useRef<number>();
  const displayTimeRef = useRef<HTMLDivElement>(null);

  const updateDisplay = () => {
    if (displayTimeRef.current) {
      const minutes = Math.floor(timeLeftRef.current / 60);
      const seconds = timeLeftRef.current % 60;
      displayTimeRef.current.textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  };

  const animate = () => {
    const now = Date.now();
    const delta = now - lastUpdateRef.current;
    
    if (delta >= 1000) {
      timeLeftRef.current = Math.max(0, timeLeftRef.current - 1);
      lastUpdateRef.current = now;
      updateDisplay();

      if (timeLeftRef.current <= 0) {
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
        }
        onTimeEnd();
        return;
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isActive) {
      timeLeftRef.current = initialTime;
      lastUpdateRef.current = Date.now();
      requestRef.current = requestAnimationFrame(animate);
      updateDisplay();
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      timeLeftRef.current = initialTime;
      updateDisplay();
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isActive, initialTime]);

  return (
    <div 
      ref={displayTimeRef}
      className="text-2xl font-bold text-center mb-4"
    >
      {String(Math.floor(initialTime / 60)).padStart(2, '0')}:
      {String(initialTime % 60).padStart(2, '0')}
    </div>
  );
}