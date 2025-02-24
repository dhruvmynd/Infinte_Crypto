import { useRef, useEffect } from 'react';
import { usePoints } from './usePoints';
import { DraggableItem } from '../types';

export function useCanvas(
  items: DraggableItem[], 
  draggingItem: string | null,
  getElementName: (item: DraggableItem) => string
) {
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

    // Draw connections to nearby points
    ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    item.connectedPoints.forEach(point => {
      ctx.beginPath();
      ctx.moveTo(item.position!.x, item.position!.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    });

    // Get text metrics for proper background sizing
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const translatedName = getElementName(item);
    const textMetrics = ctx.measureText(translatedName);
    const textWidth = textMetrics.width;
    const padding = 20;
    const bgWidth = textWidth + (padding * 2);
    const bgHeight = 30;

    // Draw background
    ctx.fillStyle = isDarkMode ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.roundRect(
      item.position.x - (bgWidth / 2), 
      item.position.y - (bgHeight / 2), 
      bgWidth, 
      bgHeight, 
      15
    );
    ctx.fill();

    // Draw text
    ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)';
    ctx.fillText(translatedName, item.position.x, item.position.y);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize canvas size and points
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

      // Draw and update points
      ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
      updatePoints(deltaTime, dpr);
      
      points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
        ctx.fill();
      });

      // Update item connections and draw elements
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
    animationFrameRef.current = requestAnimationFrame(animate);

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
  }, [items, draggingItem, getElementName, points, initializePoints, updatePoints]);

  return { canvasRef, containerRef };
}