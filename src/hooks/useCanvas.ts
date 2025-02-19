import { useRef, useEffect } from 'react';
import { usePoints } from './usePoints';
import { DraggableItem } from '../types';

export function useCanvas(items: DraggableItem[], draggingItem: string | null) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(performance.now());
  const dimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const isInitializedRef = useRef(false);

  const updateCanvasSize = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    dimensionsRef.current = { width: rect.width, height: rect.height };
    return dimensionsRef.current;
  };

  const { points, initializePoints, updatePoints } = usePoints(
    dimensionsRef.current?.width || 0,
    dimensionsRef.current?.height || 0
  );

  const drawElement = (ctx: CanvasRenderingContext2D, item: DraggableItem, isDarkMode: boolean) => {
    if (!item.position) return;

    // Set line color based on theme
    ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    item.connectedPoints.forEach(point => {
      ctx.beginPath();
      ctx.moveTo(item.position!.x, item.position!.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    });

    ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
    ctx.beginPath();
    ctx.roundRect(item.position.x - 30, item.position.y - 15, 60, 30, 15);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.name, item.position.x, item.position.y);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize canvas size and points immediately
    const dimensions = updateCanvasSize();
    if (dimensions && !isInitializedRef.current) {
      initializePoints();
      isInitializedRef.current = true;
    }

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;

      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      // Check if dark mode is enabled
      const isDarkMode = document.documentElement.classList.contains('dark');
      ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
      updatePoints(deltaTime, dpr);
      
      points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
        ctx.fill();
      });

      items.forEach(item => {
        if (item.position) {
          const nearbyPoints = points.filter(point => {
            const dx = point.x - item.position!.x;
            const dy = point.y - item.position!.y;
            return Math.sqrt(dx * dx + dy * dy) < 100;
          });

          if (item.id === draggingItem || JSON.stringify(item.connectedPoints) !== JSON.stringify(nearbyPoints)) {
            item.connectedPoints = nearbyPoints;
          }

          drawElement(ctx, item, isDarkMode);
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastFrameTimeRef.current = performance.now();
    animate(lastFrameTimeRef.current);

    const handleResize = () => {
      const newDimensions = updateCanvasSize();
      if (newDimensions) {
        isInitializedRef.current = false;
        initializePoints();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [items, draggingItem]);

  return { canvasRef, containerRef };
}