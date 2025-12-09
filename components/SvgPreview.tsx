
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { Code, ZoomIn, ZoomOut, Moon, Sun, Grid, Download, AlertTriangle, Maximize, Undo2, Redo2, Layers, Move, ChevronLeft } from 'lucide-react';
import { GeneratedSvg, GenerationStatus } from '../types';
import { EditorTools } from './EditorTools';

interface SvgPreviewProps {
  data: GeneratedSvg | null;
  onRefine: (instruction: string) => void;
  status: GenerationStatus;
}

type BgMode = 'dark' | 'light' | 'grid';

// --- Transform Overlay Component ---

interface TransformOverlayProps {
    targetId: string;
    zoom: number;
    svgContent: string; // Used to trigger re-renders/checks
    onUpdate: (newContent: string) => void;
}

const TransformOverlay: React.FC<TransformOverlayProps> = ({ targetId, zoom, svgContent, onUpdate }) => {
    const [bbox, setBbox] = useState<{x: number, y: number, width: number, height: number} | null>(null);
    const [transform, setTransform] = useState({
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0
    });
    const overlayRef = useRef<HTMLDivElement>(null);

    // Sync state with DOM element
    useLayoutEffect(() => {
        const el = document.getElementById(targetId) as unknown as SVGGraphicsElement;
        if (el && el.getBBox) {
            try {
                // Get geometry BBox (without transforms)
                const b = el.getBBox();
                setBbox({ x: b.x, y: b.y, width: b.width, height: b.height });

                // Parse current transforms from style
                const style = el.getAttribute('style') || '';
                const rotateMatch = style.match(/rotate\(([\d\.-]+)deg\)/);
                const scaleMatch = style.match(/scale\(([\d\.-]+)(?:,\s*([\d\.-]+))?\)/);
                const skewXMatch = style.match(/skewX\(([\d\.-]+)deg\)/);
                const skewYMatch = style.match(/skewY\(([\d\.-]+)deg\)/);

                setTransform({
                    rotate: rotateMatch ? parseFloat(rotateMatch[1]) : 0,
                    scaleX: scaleMatch ? parseFloat(scaleMatch[1]) : 1,
                    scaleY: scaleMatch ? parseFloat(scaleMatch[2] || scaleMatch[1]) : 1,
                    skewX: skewXMatch ? parseFloat(skewXMatch[1]) : 0,
                    skewY: skewYMatch ? parseFloat(skewYMatch[1]) : 0,
                });
            } catch (e) {
                console.warn("Could not get BBox for element", targetId);
                setBbox(null);
            }
        }
    }, [targetId, svgContent]);

    const handleDragStart = (e: React.MouseEvent, type: string) => {
        e.preventDefault();
        e.stopPropagation();

        const el = document.getElementById(targetId) as unknown as SVGGraphicsElement;
        if (!el) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const startTransform = { ...transform };
        
        // For rotation calculations
        const boxRect = overlayRef.current?.getBoundingClientRect();
        const centerX = boxRect ? boxRect.left + boxRect.width / 2 : 0;
        const centerY = boxRect ? boxRect.top + boxRect.height / 2 : 0;

        const handleMove = (moveEvent: MouseEvent) => {
            const dx = (moveEvent.clientX - startX) / zoom;
            const dy = (moveEvent.clientY - startY) / zoom;
            
            let newTransform = { ...startTransform };

            if (type === 'rotate') {
                // Calculate angle relative to center
                const currentAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX) * 180 / Math.PI;
                const startAngleVal = Math.atan2(startY - centerY, startX - centerX) * 180 / Math.PI;
                const deltaRotation = currentAngle - startAngleVal;
                newTransform.rotate = (startTransform.rotate + deltaRotation + 90) % 360; // +90 offset for top handle
            } else {
                // Scaling / Skewing
                const isSkew = moveEvent.ctrlKey || moveEvent.metaKey;

                if (type.includes('n')) {
                     if (isSkew) newTransform.skewX = startTransform.skewX + dx * 0.5;
                     else newTransform.scaleY = startTransform.scaleY - (dy / (bbox?.height || 100)) * 2; // *2 approx factor
                }
                if (type.includes('s')) {
                    if (isSkew) newTransform.skewX = startTransform.skewX - dx * 0.5;
                    else newTransform.scaleY = startTransform.scaleY + (dy / (bbox?.height || 100)) * 2;
                }
                if (type.includes('w')) {
                    if (isSkew) newTransform.skewY = startTransform.skewY + dy * 0.5;
                    else newTransform.scaleX = startTransform.scaleX - (dx / (bbox?.width || 100)) * 2;
                }
                if (type.includes('e')) {
                    if (isSkew) newTransform.skewY = startTransform.skewY - dy * 0.5;
                    else newTransform.scaleX = startTransform.scaleX + (dx / (bbox?.width || 100)) * 2;
                }
            }
            
            // Apply immediately for feedback
            setTransform(newTransform);
            
            // Construct transform string
            const transformStr = `
                rotate(${newTransform.rotate}deg) 
                scale(${newTransform.scaleX.toFixed(3)}, ${newTransform.scaleY.toFixed(3)}) 
                skewX(${newTransform.skewX.toFixed(1)}deg) 
                skewY(${newTransform.skewY.toFixed(1)}deg)
            `.replace(/\s+/g, ' ').trim();

            const currentStyle = el.getAttribute('style') || '';
            // Remove existing transforms
            let newStyle = currentStyle.replace(/transform:[^;]+;?/g, '').trim();
            // Add new
            newStyle += ` transform: ${transformStr}; transform-box: fill-box; transform-origin: center;`;
            
            el.setAttribute('style', newStyle);
        };

        const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            // Save final state
            const svg = el.ownerSVGElement;
            if (svg) onUpdate(svg.outerHTML);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
    };

    if (!bbox) return null;

    // CSS Transform for the Overlay Box itself
    const overlayStyle: React.CSSProperties = {
        position: 'absolute',
        left: bbox.x,
        top: bbox.y,
        width: bbox.width,
        height: bbox.height,
        transformOrigin: 'center',
        transform: `rotate(${transform.rotate}deg) scale(${transform.scaleX}, ${transform.scaleY}) skewX(${transform.skewX}deg) skewY(${transform.skewY}deg)`,
        pointerEvents: 'none', // Allow clicks to pass through body, but handles catch them
        border: '1px solid #6366f1',
        boxSizing: 'border-box'
    };

    // Handle styles
    const handleSize = 8 / zoom; // Constant visual size
    const handleStyle = (cursor: string): React.CSSProperties => ({
        position: 'absolute',
        width: handleSize,
        height: handleSize,
        backgroundColor: 'white',
        border: '1px solid #6366f1',
        borderRadius: '2px', // Square handles for resize
        cursor: cursor,
        pointerEvents: 'auto',
        zIndex: 50
    });

    const rotHandleStyle: React.CSSProperties = {
        ...handleStyle('grab'),
        borderRadius: '50%',
        backgroundColor: '#6366f1',
        top: -20 / zoom,
        left: '50%',
        transform: 'translateX(-50%)'
    };

    return (
        <div ref={overlayRef} style={overlayStyle}>
            {/* Rotation Line & Handle */}
            <div style={{ position: 'absolute', left: '50%', top: 0, height: -20/zoom, borderLeft: '1px solid #6366f1' }} />
            <div style={rotHandleStyle} onMouseDown={(e) => handleDragStart(e, 'rotate')} title="Rotate" />

            {/* Resize Handles */}
            <div style={{ ...handleStyle('nw-resize'), top: -handleSize/2, left: -handleSize/2 }} onMouseDown={(e) => handleDragStart(e, 'nw')} />
            <div style={{ ...handleStyle('n-resize'), top: -handleSize/2, left: '50%', transform: 'translateX(-50%)' }} onMouseDown={(e) => handleDragStart(e, 'n')} title="Drag to Resize, Ctrl+Drag to Skew X" />
            <div style={{ ...handleStyle('ne-resize'), top: -handleSize/2, right: -handleSize/2 }} onMouseDown={(e) => handleDragStart(e, 'ne')} />
            
            <div style={{ ...handleStyle('w-resize'), top: '50%', left: -handleSize/2, transform: 'translateY(-50%)' }} onMouseDown={(e) => handleDragStart(e, 'w')} title="Drag to Resize, Ctrl+Drag to Skew Y" />
            <div style={{ ...handleStyle('e-resize'), top: '50%', right: -handleSize/2, transform: 'translateY(-50%)' }} onMouseDown={(e) => handleDragStart(e, 'e')} title="Drag to Resize, Ctrl+Drag to Skew Y" />
            
            <div style={{ ...handleStyle('sw-resize'), bottom: -handleSize/2, left: -handleSize/2 }} onMouseDown={(e) => handleDragStart(e, 'sw')} />
            <div style={{ ...handleStyle('s-resize'), bottom: -handleSize/2, left: '50%', transform: 'translateX(-50%)' }} onMouseDown={(e) => handleDragStart(e, 's')} title="Drag to Resize, Ctrl+Drag to Skew X" />
            <div style={{ ...handleStyle('se-resize'), bottom: -handleSize/2, right: -handleSize/2 }} onMouseDown={(e) => handleDragStart(e, 'se')} />
        </div>
    );
};


export const SvgPreview: React.FC<SvgPreviewProps> = ({ data, onRefine, status }) => {
  const [currentContent, setCurrentContent] = useState('');
  
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [zoom, setZoom] = useState(1);
  const [bgMode, setBgMode] = useState<BgMode>('grid');
  const [showCode, setShowCode] = useState(false);
  const [showEditor, setShowEditor] = useState(true);
  
  const [renderError, setRenderError] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  const clipboardRef = useRef<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  
  // Drag State (for moving elements)
  const dragRef = useRef<{
    isDragging: boolean;
    el: SVGElement | null;
    startX: number;
    startY: number;
    startAttrX: number;
    startAttrY: number;
    type: 'xy' | 'cxcy';
  }>({ 
    isDragging: false, 
    el: null, 
    startX: 0, 
    startY: 0, 
    startAttrX: 0, 
    startAttrY: 0,
    type: 'xy' 
  });

  // Ensure unique IDs AND enforce visibility (ViewBox/Dimensions)
  const normalizeSvg = useCallback((svgString: string) => {
    if (!svgString) return '';
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        
        // Check if parsing failed
        if (doc.querySelector('parsererror')) {
            return svgString;
        }

        const svg = doc.querySelector('svg');
        if (!svg) return svgString;

        // 1. Ensure Namespace
        if (!svg.getAttribute('xmlns')) {
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }

        // 2. Ensure Dimensions & ViewBox
        let viewBox = svg.getAttribute('viewBox');
        let width = svg.getAttribute('width');
        let height = svg.getAttribute('height');

        // Check for "100%" or missing values which can cause collapse
        if (width === '100%') width = null; 
        if (height === '100%') height = null;

        if (!viewBox) {
            // Try to create viewBox from width/height if available
            if (width && height && !width.includes('%') && !height.includes('%')) {
                 viewBox = `0 0 ${parseFloat(width)} ${parseFloat(height)}`;
                 svg.setAttribute('viewBox', viewBox);
            } else {
                // Absolute fallback to 512x512 if no dimensions exist
                viewBox = '0 0 512 512';
                svg.setAttribute('viewBox', viewBox);
            }
        }

        // Ensure explicit width/height pixels are set based on viewBox to prevent layout collapse
        const vbParts = viewBox.split(/[\s,]+/).map(n => parseFloat(n));
        if (vbParts.length >= 4) {
             // Only set if missing or percentage
            if (!width || width.includes('%')) svg.setAttribute('width', vbParts[2].toString());
            if (!height || height.includes('%')) svg.setAttribute('height', vbParts[3].toString());
        }

        // 3. Ensure Unique IDs for Editor
        const elements = svg.querySelectorAll('g, path, rect, circle, ellipse, text, image, line, polygon, polyline');
        elements.forEach((el, index) => {
            if (!el.id) {
                el.id = `${el.tagName.toLowerCase()}_${index}_${Date.now().toString(36).slice(-5)}`;
            }
        });

        return svg.outerHTML;
    } catch (e) {
        console.error("Error normalizing SVG:", e);
        return svgString;
    }
  }, []);

  // Init Data
  useEffect(() => {
    if (data && data.content) {
      const normalizedContent = normalizeSvg(data.content);
      setCurrentContent(normalizedContent);
      setHistory([normalizedContent]);
      setHistoryIndex(0);
      setZoom(0.8);
      setSelectedElementId(null);
      
      // Auto-hide editor on mobile when new SVG is generated to focus on preview
      if (window.innerWidth < 768) {
          setShowEditor(false);
      } else {
          setShowEditor(true);
      }

      setTimeout(handleFitToScreen, 100);
    }
  }, [data?.id, normalizeSvg]);

  // Validate SVG
  useEffect(() => {
     try {
        if(!currentContent) {
            return;
        }
        const parser = new DOMParser();
        const doc = parser.parseFromString(currentContent, 'image/svg+xml');
        if(doc.querySelector('parsererror')) {
            setRenderError("Invalid SVG Data");
        } else {
            setRenderError(null);
        }
     } catch(e) {
         setRenderError("Error parsing SVG");
     }
  }, [currentContent]);

  const handleUpdate = (newContent: string) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newContent);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setCurrentContent(newContent);
  };

  const undo = () => { if(historyIndex > 0) { setHistoryIndex(h => h - 1); setCurrentContent(history[historyIndex - 1]); } };
  const redo = () => { if(historyIndex < history.length - 1) { setHistoryIndex(h => h + 1); setCurrentContent(history[historyIndex + 1]); } };

  const handleFitToScreen = useCallback(() => {
    if (!svgContainerRef.current || !currentContent) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(currentContent, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return;
    
    // Parse dimensions
    let w = 100, h = 100;
    const viewBox = svg.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
    if (viewBox && viewBox.length >= 4) {
        w = viewBox[2];
        h = viewBox[3];
    } else {
        w = parseFloat(svg.getAttribute('width') || '100');
        h = parseFloat(svg.getAttribute('height') || '100');
    }
    
    // Safety check for NaN or 0
    if (isNaN(w) || w <= 0) w = 100;
    if (isNaN(h) || h <= 0) h = 100;

    const container = svgContainerRef.current;
    if (container.clientWidth && container.clientHeight) {
        const scale = Math.min((container.clientWidth - 80) / w, (container.clientHeight - 80) / h);
        setZoom(Math.max(0.1, Math.min(5, scale)));
    }
  }, [currentContent]);

  const handleDownload = () => {
      const blob = new Blob([currentContent], {type: 'image/svg+xml'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vector-${Date.now()}.svg`;
      link.click();
  };

  // --- Drag & Drop Logic (Movement) ---

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow drag if editor is visible (implies edit mode)
    if (!showEditor || e.button !== 0) return;

    const target = e.target as SVGElement;
    // If clicking canvas background, deselect
    if (target.tagName === 'svg' || target.id === 'editor-background') {
        setSelectedElementId(null);
        return;
    }

    // Find closest selectable SVG element
    const element = target.closest('g, path, rect, circle, ellipse, text, image, line, polygon, polyline') as SVGElement;
    if (!element) return;

    e.preventDefault();
    e.stopPropagation();

    // 1. SELECT THE ELEMENT
    if (!element.id) {
        element.id = `el-${Date.now()}`;
        const svg = element.ownerSVGElement;
        if (svg) handleUpdate(svg.outerHTML);
    }
    setSelectedElementId(element.id);

    // 2. MOVE LOGIC (Only for basic shapes where x/y is intuitive, or text)
    const tagName = element.tagName.toLowerCase();
    if (!['text', 'rect', 'image', 'circle', 'ellipse'].includes(tagName)) {
        return;
    }

    const state = dragRef.current;
    state.isDragging = true;
    state.el = element;
    state.startX = e.clientX;
    state.startY = e.clientY;
    
    if (tagName === 'circle' || tagName === 'ellipse') {
        state.type = 'cxcy';
        state.startAttrX = parseFloat(element.getAttribute('cx') || '0');
        state.startAttrY = parseFloat(element.getAttribute('cy') || '0');
    } else {
        state.type = 'xy';
        state.startAttrX = parseFloat(element.getAttribute('x') || '0');
        state.startAttrY = parseFloat(element.getAttribute('y') || '0');
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
      const state = dragRef.current;
      if (!state.isDragging || !state.el) return;

      e.preventDefault();
      const dx = (e.clientX - state.startX) / zoom;
      const dy = (e.clientY - state.startY) / zoom;

      if (state.type === 'cxcy') {
          state.el.setAttribute('cx', (state.startAttrX + dx).toString());
          state.el.setAttribute('cy', (state.startAttrY + dy).toString());
      } else {
          state.el.setAttribute('x', (state.startAttrX + dx).toString());
          state.el.setAttribute('y', (state.startAttrY + dy).toString());
      }
  }, [zoom]);

  const handleMouseUp = useCallback(() => {
      const state = dragRef.current;
      if (state.isDragging) {
          state.isDragging = false;
          state.el = null;
          if (containerRef.current) {
              const svg = containerRef.current.querySelector('svg');
              if (svg) handleUpdate(svg.outerHTML);
          }
      }
  }, [handleUpdate]);

  useEffect(() => {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      }
  }, [handleMouseMove, handleMouseUp]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '') || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }

      const isCmd = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z
      if (isCmd && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((isCmd && e.key.toLowerCase() === 'z' && e.shiftKey) || (isCmd && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Deselect: Esc
      if (e.key === 'Escape') {
          e.preventDefault();
          setSelectedElementId(null);
          return;
      }

      // Zoom Controls
      if (isCmd && e.key === '0') {
          e.preventDefault();
          handleFitToScreen();
          return;
      }
      if ((isCmd && (e.key === '=' || e.key === '+')) || e.key === '+') {
          e.preventDefault();
          setZoom(z => Math.min(5, z + 0.1));
          return;
      }
      if ((isCmd && e.key === '-') || e.key === '-') {
          e.preventDefault();
          setZoom(z => Math.max(0.1, z - 0.1));
          return;
      }

      // --- Actions requiring a selection ---
      if (!selectedElementId) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(currentContent, 'image/svg+xml');
      const el = doc.getElementById(selectedElementId);
      const svg = doc.querySelector('svg');

      if (!el || !svg) return;

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          el.remove();
          handleUpdate(svg.outerHTML);
          setSelectedElementId(null);
          return;
      }

      // Copy (Ctrl+C)
      if (isCmd && e.key.toLowerCase() === 'c') {
          e.preventDefault();
          clipboardRef.current = el.outerHTML;
          return;
      }

      // Cut (Ctrl+X)
      if (isCmd && e.key.toLowerCase() === 'x') {
          e.preventDefault();
          clipboardRef.current = el.outerHTML;
          el.remove();
          handleUpdate(svg.outerHTML);
          setSelectedElementId(null);
          return;
      }

      // Duplicate (Ctrl+D)
      if (isCmd && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          const newEl = el.cloneNode(true) as SVGElement;
          const newId = `dup-${Date.now()}`;
          newEl.id = newId;
          
          // Offset logic
          const tagName = newEl.tagName.toLowerCase();
          if (['rect', 'image', 'text', 'use'].includes(tagName)) {
             newEl.setAttribute('x', ((parseFloat(newEl.getAttribute('x')||'0')) + 10).toString());
             newEl.setAttribute('y', ((parseFloat(newEl.getAttribute('y')||'0')) + 10).toString());
          } else if (['circle', 'ellipse'].includes(tagName)) {
             newEl.setAttribute('cx', ((parseFloat(newEl.getAttribute('cx')||'0')) + 10).toString());
             newEl.setAttribute('cy', ((parseFloat(newEl.getAttribute('cy')||'0')) + 10).toString());
          } else {
             const t = newEl.getAttribute('transform') || '';
             newEl.setAttribute('transform', `${t} translate(10, 10)`);
          }

          el.insertAdjacentElement('afterend', newEl);
          handleUpdate(svg.outerHTML);
          setSelectedElementId(newId);
          return;
      }

      // Nudge (Arrows)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          let dx = 0, dy = 0;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;
          if (e.key === 'ArrowUp') dy = -step;
          if (e.key === 'ArrowDown') dy = step;

          const tagName = el.tagName.toLowerCase();
          if (['rect', 'image', 'text', 'use'].includes(tagName)) {
             const x = parseFloat(el.getAttribute('x')||'0');
             const y = parseFloat(el.getAttribute('y')||'0');
             el.setAttribute('x', (x + dx).toString());
             el.setAttribute('y', (y + dy).toString());
             handleUpdate(svg.outerHTML);
          } else if (['circle', 'ellipse'].includes(tagName)) {
             const cx = parseFloat(el.getAttribute('cx')||'0');
             const cy = parseFloat(el.getAttribute('cy')||'0');
             el.setAttribute('cx', (cx + dx).toString());
             el.setAttribute('cy', (cy + dy).toString());
             handleUpdate(svg.outerHTML);
          }
      }
    };
    
    // Paste Global Listener (doesn't need selection)
    const handlePaste = (e: KeyboardEvent) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '') || (document.activeElement as HTMLElement)?.isContentEditable) return;
        const isCmd = e.ctrlKey || e.metaKey;
        
        if (isCmd && e.key.toLowerCase() === 'v' && clipboardRef.current) {
            e.preventDefault();
            const parser = new DOMParser();
            const doc = parser.parseFromString(currentContent, 'image/svg+xml');
            const svg = doc.querySelector('svg');
            if (svg) {
                const temp = document.createElement('div');
                temp.innerHTML = clipboardRef.current;
                const newEl = temp.firstElementChild as SVGElement;
                if (newEl) {
                    const newId = `paste-${Date.now()}`;
                    newEl.id = newId;
                    // Offset
                    const tagName = newEl.tagName.toLowerCase();
                    if (['rect', 'image', 'text', 'use'].includes(tagName)) {
                        newEl.setAttribute('x', ((parseFloat(newEl.getAttribute('x')||'0')) + 10).toString());
                        newEl.setAttribute('y', ((parseFloat(newEl.getAttribute('y')||'0')) + 10).toString());
                    } else if (['circle', 'ellipse'].includes(tagName)) {
                        newEl.setAttribute('cx', ((parseFloat(newEl.getAttribute('cx')||'0')) + 10).toString());
                        newEl.setAttribute('cy', ((parseFloat(newEl.getAttribute('cy')||'0')) + 10).toString());
                    } else {
                        const t = newEl.getAttribute('transform') || '';
                        newEl.setAttribute('transform', `${t} translate(10, 10)`);
                    }
                    svg.appendChild(newEl);
                    handleUpdate(svg.outerHTML);
                    setSelectedElementId(newId);
                }
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handlePaste); // Attach separate or inside
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keydown', handlePaste);
    }
  }, [undo, redo, selectedElementId, currentContent, handleUpdate, handleFitToScreen]);

  const getBgClass = () => {
      if(bgMode === 'light') return 'bg-zinc-200';
      if(bgMode === 'dark') return 'bg-black';
      return 'bg-[#18181b] bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:24px_24px]';
  };

  if(!data) return null;

  return (
    <div className="flex-1 flex flex-col h-full relative">
        <div className="flex-1 flex overflow-hidden">
            {/* Canvas */}
            <div className={`flex-1 relative overflow-hidden flex flex-col ${getBgClass()}`}>
                
                {/* Top Toolbar - Mobile Responsive */}
                <div className="absolute top-4 right-4 left-4 md:left-auto md:right-4 z-30 flex flex-wrap justify-end gap-2 pointer-events-none">
                    <div className="flex bg-zinc-900/90 backdrop-blur border border-white/10 rounded-lg p-1 shadow-xl pointer-events-auto">
                        <button onClick={() => setBgMode('dark')} className={`p-2 rounded ${bgMode === 'dark' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><Moon className="w-4 h-4" /></button>
                        <button onClick={() => setBgMode('grid')} className={`p-2 rounded ${bgMode === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><Grid className="w-4 h-4" /></button>
                        <button onClick={() => setBgMode('light')} className={`p-2 rounded ${bgMode === 'light' ? 'bg-zinc-200 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}><Sun className="w-4 h-4" /></button>
                    </div>
                    
                    <div className="flex bg-zinc-900/90 backdrop-blur border border-white/10 rounded-lg p-1 shadow-xl pointer-events-auto">
                        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-2 text-zinc-400 hover:text-white"><ZoomOut className="w-4 h-4" /></button>
                        <span className="text-xs font-mono w-10 text-center flex items-center justify-center text-zinc-500 hidden sm:flex">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="p-2 text-zinc-400 hover:text-white"><ZoomIn className="w-4 h-4" /></button>
                        <button onClick={handleFitToScreen} className="p-2 text-zinc-400 hover:text-white border-l border-white/5 ml-1"><Maximize className="w-4 h-4" /></button>
                    </div>

                    <div className="flex bg-zinc-900/90 backdrop-blur border border-white/10 rounded-lg p-1 shadow-xl pointer-events-auto">
                        <button onClick={() => setShowCode(!showCode)} className={`p-2 rounded ${showCode ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`} title="Toggle Code"><Code className="w-4 h-4" /></button>
                        <button onClick={() => setShowEditor(!showEditor)} className={`p-2 rounded ${showEditor ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`} title="Toggle Editor"><Layers className="w-4 h-4" /></button>
                        <button onClick={handleDownload} className="p-2 text-zinc-400 hover:text-green-400 border-l border-white/5 ml-1"><Download className="w-4 h-4" /></button>
                    </div>
                </div>

                {renderError && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg flex items-center gap-2 z-50">
                        <AlertTriangle className="w-4 h-4" /> {renderError}
                    </div>
                )}
                
                {showCode ? (
                    <div className="absolute inset-0 z-20 bg-zinc-950/90 backdrop-blur p-4 md:p-8 overflow-auto animate-in fade-in">
                        <div className="max-w-3xl mx-auto h-full flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-zinc-400 font-mono text-xs uppercase tracking-wider">Source Code</h3>
                                <button onClick={() => setShowCode(false)} className="text-zinc-500 hover:text-white md:hidden p-2"><ChevronLeft className="w-5 h-5"/></button>
                            </div>
                            <textarea 
                                value={currentContent} 
                                onChange={(e) => handleUpdate(e.target.value)} 
                                className="w-full flex-1 bg-black border border-white/10 rounded-xl p-6 font-mono text-xs md:text-sm text-green-400 focus:outline-none resize-none"
                                spellCheck={false}
                            />
                        </div>
                    </div>
                ) : (
                    <div 
                        ref={svgContainerRef} 
                        className="flex-1 overflow-auto flex items-center justify-center p-0 cursor-default" 
                    >
                        <div 
                            ref={containerRef}
                            style={{ 
                                transform: `scale(${zoom})`, 
                                transformOrigin: 'center',
                                transition: dragRef.current.isDragging ? 'none' : 'transform 0.1s' 
                            }} 
                            className={`shadow-2xl relative ${showEditor ? 'cursor-default' : ''}`}
                        >
                             <div 
                                dangerouslySetInnerHTML={{ __html: currentContent }}
                                onMouseDown={handleMouseDown}
                             />
                             {selectedElementId && (
                                <TransformOverlay 
                                    targetId={selectedElementId} 
                                    zoom={zoom} 
                                    svgContent={currentContent}
                                    onUpdate={handleUpdate}
                                />
                             )}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Editor Panel - Responsive Drawer */}
            {showEditor && (
                <div className="fixed inset-0 z-50 w-full bg-zinc-900 md:relative md:w-80 md:inset-auto border-l border-white/10 flex flex-col animate-in slide-in-from-right shadow-2xl h-full">
                     <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
                         <div className="flex items-center gap-2">
                             <button onClick={() => setShowEditor(false)} className="md:hidden p-1 -ml-1 text-zinc-400 hover:text-white">
                                <ChevronLeft className="w-5 h-5" />
                             </button>
                             <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Properties</h3>
                             {selectedElementId && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">#{selectedElementId.slice(0,8)}</span>}
                         </div>
                         <div className="flex gap-1">
                             <button onClick={undo} disabled={historyIndex === 0} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white disabled:opacity-30"><Undo2 className="w-3.5 h-3.5" /></button>
                             <button onClick={redo} disabled={historyIndex === history.length -1} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white disabled:opacity-30"><Redo2 className="w-3.5 h-3.5" /></button>
                         </div>
                     </div>
                     <EditorTools 
                        svgContent={currentContent} 
                        onUpdate={handleUpdate} 
                        selectedElementId={selectedElementId}
                        onSelectLayer={setSelectedElementId}
                    />
                </div>
            )}
        </div>
    </div>
  );
};
