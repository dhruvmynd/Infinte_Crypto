import { useRef, useEffect } from 'react';
import { Point } from '../types';

export function usePoints(canvasWidth: number, canvasHeight: number) {
  const pointsRef = useRef<Point[]>([]);

  const initializePoints = () => {
    if (!canvasWidth || !canvasHeight) return;

    // Create more points for a denser effect
    const numPoints = Math.floor((canvasWidth * canvasHeight) / 8000);
    pointsRef.current = Array.from({ length: numPoints }, (_, i) => ({
      id: i,
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      vx: (Math.random() - 0.5) * 0.3, // Slower movement
      vy: (Math.random() - 0.5) * 0.3, // Slower movement
      lastUpdate: performance.now()
    }));
  };

  const updatePoints = (deltaTime: number, dpr: number) => {
    pointsRef.current.forEach(point => {
      // Smoother movement
      point.x += point.vx * (deltaTime / 16);
      point.y += point.vy * (deltaTime / 16);

      // Bounce off edges
      if (point.x <= 0 || point.x >= canvasWidth / dpr) {
        point.vx *= -1;
        point.x = Math.max(0, Math.min(point.x, canvasWidth / dpr));
      }
      if (point.y <= 0 || point.y >= canvasHeight / dpr) {
        point.vy *= -1;
        point.y = Math.max(0, Math.min(point.y, canvasHeight / dpr));
      }
    });
  };

  // Initialize points when canvas dimensions change
  useEffect(() => {
    if (canvasWidth && canvasHeight) {
      initializePoints();
    }
  }, [canvasWidth, canvasHeight]);

  return {
    points: pointsRef.current,
    initializePoints,
    updatePoints
  };
}