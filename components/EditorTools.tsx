
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { Layers, Square, Circle, Triangle, Type, Trash2, Eye, EyeOff, Palette, MousePointer2, Copy, ArrowUp, ArrowDown, Move, Wand2, Star, AlignLeft, AlignCenter, AlignRight, ArrowUpToLine, AlignJustify, ArrowDownToLine, Crosshair, Type as TypeIcon, Box, Image as ImageIcon, Maximize, Heart, ArrowRight as ArrowIcon, MessageCircle, FlipHorizontal, FlipVertical } from 'lucide-react';

interface EditorToolsProps {
  svgContent: string;
  onUpdate: (newContent: string) => void;
  selectedElementId: string | null;
  onSelectLayer: (id: string | null) => void;
}

type Tab = 'style' | 'layers' | 'tools';

// Robust color converter for input type="color"
const toHex = (color: string): string => {
  if (!color || color === 'none' || color.startsWith('url(')) return '#000000';
  
  // Already hex
  if (/^#[0-9A-F]{6}$/i.test(color)) return color;
  if (/^#[0-9A-F]{3}$/i.test(color)) {
      return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }

  // Use canvas for names or rgb/rgba strings
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return '#000000';
  ctx.fillStyle = color;
  return ctx.fillStyle; // Browser returns normalized hex or rgba
};

const WEB_SAFE_FONTS = [
  'Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Palatino', 'Garamond', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact'
];

const FONT_WEIGHTS = [
  'normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'
];

const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'
];

const STROKE_CAPS = ['butt', 'round', 'square'];
const STROKE_JOINS = ['miter', 'round', 'bevel'];
const STROKE_DASHES = [
    { label: 'Solid', value: 'none' },
    { label: 'Dashed', value: '4 4' },
    { label: 'Dotted', value: '1 4' },
    { label: 'Long Dash', value: '10 4' },
    { label: 'Dash Dot', value: '10 4 2 4' }
];

export const EditorTools: React.FC<EditorToolsProps> = ({ svgContent, onUpdate, selectedElementId, onSelectLayer }) => {
  const [activeTab, setActiveTab] = useState<Tab>('style');
  const [layers, setLayers] = useState<Element[]>([]);
  const [selectedTagName, setSelectedTagName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Canvas State
  const [canvasProps, setCanvasProps] = useState({ width: 100, height: 100, bg: 'none' });

  // Property State
  const [styleProps, setStyleProps] = useState({ 
      fill: '#000000', 
      fillOpacity: '1',
      stroke: '#000000', 
      strokeWidth: '1',
      strokeOpacity: '1', 
      strokeLinecap: 'butt',
      strokeLinejoin: 'miter',
      strokeDasharray: 'none',
      opacity: '1',
      rotate: '0',
      scale: '1',
      x: '0',
      y: '0',
      rx: '0',
      fontFamily: 'sans-serif',
      fontSize: '16',
      fontWeight: 'normal',
      textContent: '',
      blendMode: 'normal',
      flipX: false,
      flipY: false,
      blur: '0',
      grayscale: '0',
      sepia: '0',
      saturate: '1',
      hueRotate: '0',
      invert: '0'
  });

  // Shadow State
  const [shadowProps, setShadowProps] = useState({
      enabled: false,
      x: 2,
      y: 2,
      blur: 2,
      color: '#000000',
      opacity: 0.5
  });

  // Gradient State
  const [fillType, setFillType] = useState<'solid' | 'linear' | 'radial'>('solid');
  const [gradientProps, setGradientProps] = useState({ start: '#000000', end: '#ffffff' });

  // Parse SVG string into DOM elements
  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (svg) {
      const children = Array.from(svg.querySelectorAll('g, path, rect, circle, ellipse, line, text, polygon, polyline, image'));
      setLayers(children.reverse());
      
      const viewBox = svg.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
      let w = 100, h = 100;
      if (viewBox && viewBox.length >= 4) {
          w = viewBox[2];
          h = viewBox[3];
      } else {
          w = parseFloat(svg.getAttribute('width') || '100');
          h = parseFloat(svg.getAttribute('height') || '100');
      }
      
      const bgRect = doc.getElementById('editor-background');
      const bg = bgRect ? bgRect.getAttribute('fill') || '#ffffff' : 'none';

      setCanvasProps({ width: w, height: h, bg });

      if (selectedElementId) {
         const el = doc.getElementById(selectedElementId);
         if (el) {
             setSelectedTagName(el.tagName);
             
             // Use Computed Style for color/opacity defaults to handle CSS classes
             // Note: computed styles on detached DOM elements (parser created) might be tricky,
             // but attributes and inline styles are safer for editing.
             const styleAttr = el.getAttribute('style') || '';
             
             // Helper to get style value from inline style OR attribute
             const getVal = (attr: string, styleName: string, def: string) => {
                const safeStyleName = styleName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const styleMatch = styleAttr.match(new RegExp(`(?:^|;)\\s*${safeStyleName}\\s*:\\s*([^;]+)`));
                if (styleMatch) return styleMatch[1].trim();
                return el.getAttribute(attr) || def;
             };

             const rotateMatch = styleAttr.match(/rotate\(([\d\.-]+)deg\)/);
             const scaleMatch = styleAttr.match(/scale\(([\d\.-]+)(?:,\s*[\d\.-]+)?\)/);
             
             const isFlippedX = styleAttr.includes('scaleX(-1)'); 
             const isFlippedY = styleAttr.includes('scaleY(-1)');

             const getFilterVal = (name: string, def: string) => {
                 const match = styleAttr.match(new RegExp(`${name}\\(([^)]+)\\)`));
                 return match ? match[1].replace('px', '').replace('%', '').replace('deg', '') : def;
             };

             const shadowMatch = styleAttr.match(/drop-shadow\(([^)]+)\)/);
             let shadowState = { enabled: false, x: 2, y: 2, blur: 2, color: '#000000', opacity: 0.5 };
             if (shadowMatch) {
                 const params = shadowMatch[1].trim().split(/\s+/);
                 shadowState.enabled = true;
                 const nums = params.filter(p => /^-?[\d\.]+(px)?$/.test(p)).map(parseFloat);
                 if (nums.length >= 2) {
                     shadowState.x = nums[0] || 2;
                     shadowState.y = nums[1] || 2;
                     shadowState.blur = nums[2] || 0;
                 }
                 const colorPart = params.find(p => p.startsWith('#') || p.startsWith('rgb'));
                 if (colorPart) {
                    if (colorPart.startsWith('rgba')) {
                         const alpha = colorPart.match(/rgba\([^)]+,([\d\.]+)\)/);
                         if (alpha) shadowState.opacity = parseFloat(alpha[1]);
                         shadowState.color = '#000000'; 
                    } else {
                         shadowState.color = toHex(colorPart);
                         shadowState.opacity = 1;
                    }
                 }
             }
             setShadowProps(shadowState);

             let xVal = '0';
             let yVal = '0';
             const tag = el.tagName.toLowerCase();
             if (tag === 'circle' || tag === 'ellipse') {
                 xVal = el.getAttribute('cx') || '0';
                 yVal = el.getAttribute('cy') || '0';
             } else if (tag === 'rect' || tag === 'text' || tag === 'image') {
                 xVal = el.getAttribute('x') || '0';
                 yVal = el.getAttribute('y') || '0';
             }

             const fillVal = getVal('fill', 'fill', '#000000');
             
             if (fillVal.startsWith('url(')) {
                 const id = fillVal.replace(/^url\(#|['"]|\)$/g, '');
                 const gradEl = doc.getElementById(id);
                 if (gradEl) {
                     setFillType(gradEl.tagName === 'radialGradient' ? 'radial' : 'linear');
                     const stops = gradEl.querySelectorAll('stop');
                     if (stops.length >= 2) {
                         setGradientProps({
                             start: stops[0].getAttribute('stop-color') || '#000000',
                             end: stops[stops.length - 1].getAttribute('stop-color') || '#ffffff'
                         });
                     }
                 } else {
                     setFillType('solid');
                 }
             } else {
                 setFillType('solid');
             }

             setStyleProps({
                 fill: fillVal,
                 fillOpacity: getVal('fill-opacity', 'fill-opacity', '1'),
                 stroke: getVal('stroke', 'stroke', 'none'),
                 strokeWidth: getVal('stroke-width', 'stroke-width', '1'),
                 strokeOpacity: getVal('stroke-opacity', 'stroke-opacity', '1'),
                 strokeLinecap: getVal('stroke-linecap', 'stroke-linecap', 'butt'),
                 strokeLinejoin: getVal('stroke-linejoin', 'stroke-linejoin', 'miter'),
                 strokeDasharray: getVal('stroke-dasharray', 'stroke-dasharray', 'none'),
                 opacity: getVal('opacity', 'opacity', '1'),
                 rotate: rotateMatch ? rotateMatch[1] : '0',
                 scale: scaleMatch ? Math.abs(parseFloat(scaleMatch[1])).toString() : '1',
                 flipX: isFlippedX,
                 flipY: isFlippedY,
                 x: parseFloat(xVal).toFixed(1),
                 y: parseFloat(yVal).toFixed(1),
                 rx: getVal('rx', 'rx', '0'),
                 fontFamily: getVal('font-family', 'font-family', 'sans-serif'),
                 fontSize: parseFloat(getVal('font-size', 'font-size', '16')).toString(),
                 fontWeight: getVal('font-weight', 'font-weight', 'normal'),
                 textContent: el.textContent || '',
                 blendMode: getVal('mix-blend-mode', 'mix-blend-mode', 'normal'),
                 blur: getFilterVal('blur', '0'),
                 grayscale: getFilterVal('grayscale', '0'),
                 sepia: getFilterVal('sepia', '0'),
                 invert: getFilterVal('invert', '0'),
                 saturate: getFilterVal('saturate', '1'),
                 hueRotate: getFilterVal('hue-rotate', '0')
             });
         } else {
             setSelectedTagName('');
         }
      } else {
          setSelectedTagName('');
          setFillType('solid');
      }
    }
  }, [svgContent, selectedElementId]);

  const modifySvg = (callback: (doc: Document, svg: SVGSVGElement) => void) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (svg) {
      callback(doc, svg);
      // Remove temp artifacts before saving if any exist (just in case)
      const outlines = doc.querySelectorAll('.selected-outline');
      outlines.forEach(el => {
          el.classList.remove('selected-outline');
          (el as unknown as HTMLElement).style.outline = '';
      });
      onUpdate(svg.outerHTML);
    }
  };

  const applyGradient = (type: 'linear' | 'radial', start: string, end: string) => {
      setGradientProps({ start, end });
      setFillType(type);
      if (!selectedElementId) return;
      modifySvg((doc, svg) => {
          let defs = svg.querySelector('defs');
          if (!defs) {
              defs = doc.createElementNS('http://www.w3.org/2000/svg', 'defs');
              svg.prepend(defs);
          }
          const el = doc.getElementById(selectedElementId) as unknown as SVGElement;
          if (!el) return;
          
          // Clear any inline fill style to ensure gradient url works
          el.style.removeProperty('fill');

          const tagName = type === 'linear' ? 'linearGradient' : 'radialGradient';
          const newId = `grad-${Date.now()}`;
          const gradEl = doc.createElementNS('http://www.w3.org/2000/svg', tagName);
          gradEl.id = newId;
          defs.appendChild(gradEl);
          el.setAttribute('fill', `url(#${newId})`);
          
          const s1 = doc.createElementNS('http://www.w3.org/2000/svg', 'stop');
          s1.setAttribute('offset', '0%');
          s1.setAttribute('stop-color', start);
          const s2 = doc.createElementNS('http://www.w3.org/2000/svg', 'stop');
          s2.setAttribute('offset', '100%');
          s2.setAttribute('stop-color', end);
          gradEl.appendChild(s1);
          gradEl.appendChild(s2);
      });
  };

  const updateStyle = (key: string, value: string | boolean) => {
      if (key === 'fill' && fillType !== 'solid') setFillType('solid');
      const newProps = { ...styleProps, [key]: value };
      setStyleProps(newProps as any);
      
      if (selectedElementId) {
          modifySvg((doc, svg) => {
              const el = doc.getElementById(selectedElementId) as unknown as SVGElement;
              if (el) {
                  const tag = el.tagName.toLowerCase();
                  
                  if (key === 'textContent') {
                      el.textContent = value as string;
                  } else if (key === 'x' || key === 'y') {
                      if (tag === 'circle' || tag === 'ellipse') el.setAttribute(key === 'x' ? 'cx' : 'cy', value as string);
                      else el.setAttribute(key, value as string);
                  } else if (key === 'rx') {
                      el.setAttribute('rx', value as string);
                      if (tag === 'rect') el.setAttribute('ry', value as string); // Sync ry
                  } else if (['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity', 'font-family', 'font-size', 'font-weight'].includes(key)) {
                      const valStr = value as string;
                      
                      // 1. Set Attribute (standard SVG way)
                      if (valStr === 'none' && key === 'stroke-dasharray') el.removeAttribute(key);
                      else el.setAttribute(key, valStr);
                      
                      // 2. Set Inline Style (CRITICAL: Overrides CSS classes)
                      // We use setProperty to ensure it takes precedence.
                      if (el.style) {
                          if (valStr === 'none' && (key === 'stroke-dasharray' || key === 'stroke')) {
                              el.style.removeProperty(key);
                          } else {
                              el.style.setProperty(key, valStr);
                          }
                      }
                  } else {
                      // Transforms & Filters - manipulate style string or use existing logic
                      let currentStyle = el.getAttribute('style') || '';
                      if (['rotate', 'scale', 'flipX', 'flipY'].includes(key)) {
                          // Remove existing transform first
                          currentStyle = currentStyle.replace(/transform:[^;]+;?/g, '').trim();
                          
                          const r = newProps.rotate;
                          const s = parseFloat(newProps.scale);
                          const scaleX = newProps.flipX ? -s : s;
                          const scaleY = newProps.flipY ? -s : s;
                          const newTransform = `transform: rotate(${r}deg) scale(${scaleX}, ${scaleY}); transform-box: fill-box; transform-origin: center;`;
                          
                          el.setAttribute('style', `${currentStyle} ${newTransform}`);
                      } else if (['blur', 'grayscale', 'sepia', 'invert', 'saturate', 'hueRotate'].includes(key)) {
                          currentStyle = currentStyle.replace(/filter:[^;]+;?/g, '').trim();
                          const filters = [];
                          if (parseFloat(newProps.blur) > 0) filters.push(`blur(${newProps.blur}px)`);
                          if (parseFloat(newProps.grayscale) > 0) filters.push(`grayscale(${newProps.grayscale})`);
                          if (parseFloat(newProps.sepia) > 0) filters.push(`sepia(${newProps.sepia})`);
                          if (parseFloat(newProps.invert) > 0) filters.push(`invert(${newProps.invert})`);
                          if (parseFloat(newProps.saturate) !== 1) filters.push(`saturate(${newProps.saturate})`);
                          if (parseFloat(newProps.hueRotate) > 0) filters.push(`hue-rotate(${newProps.hueRotate}deg)`);
                          
                          if (shadowProps.enabled) {
                              let color = shadowProps.color;
                              if (color.startsWith('#')) {
                                  const r = parseInt(color.slice(1,3), 16);
                                  const g = parseInt(color.slice(3,5), 16);
                                  const b = parseInt(color.slice(5,7), 16);
                                  color = `rgba(${r},${g},${b},${shadowProps.opacity})`;
                              }
                              filters.push(`drop-shadow(${shadowProps.x}px ${shadowProps.y}px ${shadowProps.blur}px ${color})`);
                          }
                          
                          if (filters.length > 0) el.setAttribute('style', `${currentStyle} filter: ${filters.join(' ')};`);
                          else el.setAttribute('style', currentStyle);
                      } else if (key === 'blendMode') {
                          currentStyle = currentStyle.replace(/mix-blend-mode:[^;]+;?/g, '').trim();
                          if (value !== 'normal') el.setAttribute('style', `${currentStyle} mix-blend-mode: ${value};`);
                          else el.setAttribute('style', currentStyle);
                      }
                  }
              }
          });
      }
  };

  const updateShadow = (newShadow: typeof shadowProps) => {
      setShadowProps(newShadow);
      setTimeout(() => updateStyle('blur', styleProps.blur), 0);
  };

  const updateCanvas = (key: 'width' | 'height' | 'bg', value: string) => {
      setCanvasProps(prev => ({ ...prev, [key]: value }));
      modifySvg((doc, svg) => {
          if (key === 'width' || key === 'height') {
              const w = key === 'width' ? parseFloat(value) : canvasProps.width;
              const h = key === 'height' ? parseFloat(value) : canvasProps.height;
              svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
              svg.setAttribute('width', w.toString());
              svg.setAttribute('height', h.toString());
          } else if (key === 'bg') {
              let bgRect = doc.getElementById('editor-background') as Element | null;
              if (value === 'none') {
                  if (bgRect) bgRect.remove();
              } else {
                  if (!bgRect) {
                      bgRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
                      bgRect.id = 'editor-background';
                      svg.prepend(bgRect);
                  }
                  const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number) || [0,0,100,100];
                  bgRect.setAttribute('x', (viewBox[0] - 1000).toString());
                  bgRect.setAttribute('y', (viewBox[1] - 1000).toString());
                  bgRect.setAttribute('width', (viewBox[2] + 2000).toString());
                  bgRect.setAttribute('height', (viewBox[3] + 2000).toString());
                  bgRect.setAttribute('fill', value);
              }
          }
      });
  };

  const toggleVisibility = (id: string) => {
    modifySvg((doc, svg) => {
      const el = id ? doc.getElementById(id) : null;
      if (el) {
        const currentDisplay = el.getAttribute('display');
        el.setAttribute('display', currentDisplay === 'none' ? '' : 'none');
      }
    });
  };

  const deleteLayer = (id: string) => {
    modifySvg((doc, svg) => {
      const el = id ? doc.getElementById(id) : null;
      if (el) {
        el.remove();
        if (selectedElementId === id) onSelectLayer(null);
      }
    });
  };

  const duplicateLayer = (id: string) => {
    modifySvg((doc, svg) => {
      const el = id ? doc.getElementById(id) : null;
      if (el) {
        const clone = el.cloneNode(true) as SVGElement;
        const newId = `copy-${Date.now()}`;
        clone.id = newId;
        el.insertAdjacentElement('afterend', clone);
        setTimeout(() => onSelectLayer(newId), 100);
      }
    });
  };

  const moveLayer = (id: string, direction: 'up' | 'down') => {
      modifySvg((doc, svg) => {
          const el = doc.getElementById(id);
          if (!el) return;
          if (direction === 'up') {
              const next = el.nextElementSibling;
              if (next) next.after(el);
          } else {
              const prev = el.previousElementSibling;
              if (prev) prev.before(el);
          }
      });
  };

  const alignLayer = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (!selectedElementId) return;
      modifySvg((doc, svg) => {
          const el = doc.getElementById(selectedElementId);
          if (!el) return;
          const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 100, 100];
          const vbW = viewBox[2];
          const vbH = viewBox[3];
          const tagName = el.tagName.toLowerCase();
          let x = 0, y = 0, w = 0, h = 0;
          if (tagName === 'circle') {
             w = parseFloat(el.getAttribute('r') || '0') * 2;
             h = w;
             x = parseFloat(el.getAttribute('cx') || '0') - w/2;
             y = parseFloat(el.getAttribute('cy') || '0') - h/2;
          } else if (tagName === 'rect' || tagName === 'image') {
             w = parseFloat(el.getAttribute('width') || '0');
             h = parseFloat(el.getAttribute('height') || '0');
             x = parseFloat(el.getAttribute('x') || '0');
             y = parseFloat(el.getAttribute('y') || '0');
          }
          let newX = x;
          let newY = y;
          if (alignment === 'left') newX = 0;
          if (alignment === 'center') newX = (vbW - w) / 2;
          if (alignment === 'right') newX = vbW - w;
          if (alignment === 'top') newY = 0;
          if (alignment === 'middle') newY = (vbH - h) / 2;
          if (alignment === 'bottom') newY = vbH - h;
          if (tagName === 'circle') {
              el.setAttribute('cx', (newX + w/2).toString());
              el.setAttribute('cy', (newY + h/2).toString());
          } else if (tagName === 'rect' || tagName === 'image') {
              el.setAttribute('x', newX.toString());
              el.setAttribute('y', newY.toString());
          } else if (tagName === 'text') {
              if (alignment === 'center') {
                  el.setAttribute('x', (vbW/2).toString());
                  el.setAttribute('text-anchor', 'middle');
              }
          }
      });
  };

  const addShape = (type: 'rect' | 'circle' | 'triangle' | 'text' | 'ellipse' | 'star' | 'heart' | 'arrow' | 'bubble') => {
    modifySvg((doc, svg) => {
        const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 100, 100];
        const width = viewBox[2] || 100;
        const height = viewBox[3] || 100;
        const centerX = width / 2;
        const centerY = height / 2;
        const size = Math.min(width, height) / 5;
        const id = `shape-${Date.now()}`;
        let newEl: SVGElement | null = null;
        if (type === 'rect') {
            newEl = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
            newEl.setAttribute('x', (centerX - size/2).toString());
            newEl.setAttribute('y', (centerY - size/2).toString());
            newEl.setAttribute('width', size.toString());
            newEl.setAttribute('height', size.toString());
            newEl.setAttribute('fill', '#6366f1');
        } else if (type === 'circle') {
            newEl = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
            newEl.setAttribute('cx', centerX.toString());
            newEl.setAttribute('cy', centerY.toString());
            newEl.setAttribute('r', (size/2).toString());
            newEl.setAttribute('fill', '#ec4899');
        } else if (type === 'ellipse') {
            newEl = doc.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            newEl.setAttribute('cx', centerX.toString());
            newEl.setAttribute('cy', centerY.toString());
            newEl.setAttribute('rx', (size/1.5).toString());
            newEl.setAttribute('ry', (size/3).toString());
            newEl.setAttribute('fill', '#8b5cf6');
        } else if (type === 'triangle') {
            newEl = doc.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            const h = size * (Math.sqrt(3)/2);
            const p1 = `${centerX},${centerY - h/2}`;
            const p2 = `${centerX - size/2},${centerY + h/2}`;
            const p3 = `${centerX + size/2},${centerY + h/2}`;
            newEl.setAttribute('points', `${p1} ${p2} ${p3}`);
            newEl.setAttribute('fill', '#f59e0b');
        } else if (type === 'star') {
            newEl = doc.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            const points = [];
            const outerRadius = size / 2;
            const innerRadius = size / 5;
            const spikes = 5;
            for (let i = 0; i < spikes * 2; i++) {
                const r = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (Math.PI / spikes) * i - Math.PI / 2;
                const x = centerX + Math.cos(angle) * r;
                const y = centerY + Math.sin(angle) * r;
                points.push(`${x},${y}`);
            }
            newEl.setAttribute('points', points.join(' '));
            newEl.setAttribute('fill', '#eab308');
        } else if (type === 'heart') {
            newEl = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
            const pathData = `M${centerX} ${centerY + size*0.3} C${centerX} ${centerY + size*0.3} ${centerX - size*0.6} ${centerY - size*0.3} ${centerX - size*0.3} ${centerY - size*0.6} C${centerX - size*0.1} ${centerY - size*0.8} ${centerX} ${centerY - size*0.3} ${centerX} ${centerY - size*0.3} C${centerX} ${centerY - size*0.3} ${centerX + size*0.1} ${centerY - size*0.8} ${centerX + size*0.3} ${centerY - size*0.6} C${centerX + size*0.6} ${centerY - size*0.3} ${centerX} ${centerY + size*0.3} ${centerX} ${centerY + size*0.3} Z`;
            newEl.setAttribute('d', pathData);
            newEl.setAttribute('fill', '#ef4444');
        } else if (type === 'arrow') {
            newEl = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
            const w = size;
            const h = size / 2;
            const d = `M${centerX - w/2} ${centerY - h/4} L${centerX + w/4} ${centerY - h/4} L${centerX + w/4} ${centerY - h/2} L${centerX + w/2} ${centerY} L${centerX + w/4} ${centerY + h/2} L${centerX + w/4} ${centerY + h/4} L${centerX - w/2} ${centerY + h/4} Z`;
            newEl.setAttribute('d', d);
            newEl.setAttribute('fill', '#3b82f6');
        } else if (type === 'bubble') {
            newEl = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
            const w = size;
            const h = size * 0.8;
            const d2 = `M${centerX-w/2},${centerY-h/2} h${w} v${h*0.7} h-${w/2} l-${w/4},${h*0.3} v-${h*0.3} h-${w/4} z`;
            newEl.setAttribute('d', d2);
            newEl.setAttribute('fill', '#10b981');
        } else if (type === 'text') {
            newEl = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
            newEl.setAttribute('x', centerX.toString());
            newEl.setAttribute('y', centerY.toString());
            newEl.setAttribute('text-anchor', 'middle');
            newEl.setAttribute('dominant-baseline', 'middle');
            newEl.setAttribute('fill', '#ffffff');
            newEl.setAttribute('font-size', (size/2).toString());
            newEl.textContent = 'Text';
        }
        if (newEl) {
            newEl.id = id;
            svg.appendChild(newEl);
            setTimeout(() => onSelectLayer(id), 100); 
        }
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64 = reader.result as string;
              modifySvg((doc, svg) => {
                  const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 100, 100];
                  const width = viewBox[2] || 100;
                  const height = viewBox[3] || 100;
                  const img = doc.createElementNS('http://www.w3.org/2000/svg', 'image');
                  const size = Math.min(width, height) / 2;
                  img.setAttribute('href', base64);
                  img.setAttribute('x', (width/2 - size/2).toString());
                  img.setAttribute('y', (height/2 - size/2).toString());
                  img.setAttribute('width', size.toString());
                  img.setAttribute('height', size.toString());
                  img.id = `img-${Date.now()}`;
                  svg.appendChild(img);
                  setTimeout(() => onSelectLayer(img.id), 100);
              });
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Tabs */}
      <div className="flex border-b border-white/10 overflow-x-auto no-scrollbar shrink-0">
        <button onClick={() => setActiveTab('style')} className={`flex-1 min-w-[60px] py-3 flex justify-center items-center gap-1.5 text-xs font-medium transition-colors ${activeTab === 'style' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/5' : 'text-zinc-400 hover:text-zinc-200'}`} title="Style"><Palette className="w-3.5 h-3.5" /> Style</button>
        <button onClick={() => setActiveTab('layers')} className={`flex-1 min-w-[60px] py-3 flex justify-center items-center gap-1.5 text-xs font-medium transition-colors ${activeTab === 'layers' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/5' : 'text-zinc-400 hover:text-zinc-200'}`} title="Layers"><Layers className="w-3.5 h-3.5" /> Layers</button>
        <button onClick={() => setActiveTab('tools')} className={`flex-1 min-w-[60px] py-3 flex justify-center items-center gap-1.5 text-xs font-medium transition-colors ${activeTab === 'tools' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/5' : 'text-zinc-400 hover:text-zinc-200'}`} title="Tools"><Square className="w-3.5 h-3.5" /> Add</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24">
        
        {/* LAYERS TAB */}
        {activeTab === 'layers' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-3 h-3" /> All Layers
                </p>
            </div>
            {layers.length === 0 ? (
              <p className="text-xs text-zinc-600 italic text-center py-8 border border-dashed border-zinc-800 rounded-lg">No visible layers</p>
            ) : (
              <div className="space-y-1.5">
              {layers.map((layer, i) => {
                const id = layer.id || `layer-${i}`;
                if (id === 'editor-background') return null; // Hide background rect from layers
                const isSelected = selectedElementId === id;
                return (
                <div 
                    key={i} 
                    onClick={() => onSelectLayer(id)}
                    className={`group flex items-center justify-between p-2 rounded-md border cursor-pointer transition-all ${
                        isSelected 
                        ? 'bg-indigo-600/20 border-indigo-500/50 shadow-sm' 
                        : 'bg-zinc-800/40 border-white/5 hover:bg-zinc-800 hover:border-white/10'
                    }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-400' : 'bg-zinc-600'}`}></div>
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded bg-zinc-900/50 text-zinc-400 uppercase truncate max-w-[100px]`}>
                      {layer.tagName}
                    </span>
                  </div>
                  <div className={`flex items-center gap-0.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <button onClick={(e) => { e.stopPropagation(); moveLayer(id, 'up'); }} className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white" title="Move Up"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveLayer(id, 'down'); }} className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white" title="Move Down"><ArrowDown className="w-3 h-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); duplicateLayer(id); }} className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white" title="Duplicate"><Copy className="w-3 h-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); toggleVisibility(id); }} className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white">{layer.getAttribute('display') === 'none' ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</button>
                    <button onClick={(e) => { e.stopPropagation(); deleteLayer(id); }} className="p-1 rounded hover:bg-red-900/50 text-zinc-400 hover:text-red-400" title="Delete"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              )})}
              </div>
            )}
          </div>
        )}

        {/* STYLE TAB */}
        {activeTab === 'style' && (
            <div className="space-y-6">
                {!selectedElementId ? (
                    <div className="space-y-6">
                        <div className="text-center py-6 text-zinc-500 border-b border-white/5">
                            <MousePointer2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs font-medium">Select an element on canvas to edit</p>
                        </div>
                        
                        {/* Canvas Settings */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                <Maximize className="w-3 h-3" /> Canvas Settings
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-zinc-500 mb-1 block">Width</label>
                                    <input type="number" value={canvasProps.width} onChange={(e) => updateCanvas('width', e.target.value)} className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-500 mb-1 block">Height</label>
                                    <input type="number" value={canvasProps.height} onChange={(e) => updateCanvas('height', e.target.value)} className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-zinc-500 mb-1 block">Background Color</label>
                                <div className="flex gap-2 items-center">
                                    <div className="relative w-8 h-8 rounded overflow-hidden border border-white/10 bg-zinc-800">
                                        <div className="absolute inset-0 bg-[image:linear-gradient(45deg,#3f3f46_25%,transparent_25%,transparent_75%,#3f3f46_75%,#3f3f46),linear-gradient(45deg,#3f3f46_25%,transparent_25%,transparent_75%,#3f3f46_75%,#3f3f46)] bg-[size:6px_6px] bg-[position:0_0,3px_3px] opacity-20" />
                                        <div className="absolute inset-0" style={{ backgroundColor: canvasProps.bg === 'none' ? 'transparent' : canvasProps.bg }} />
                                        <input type="color" value={toHex(canvasProps.bg)} onChange={(e) => updateCanvas('bg', e.target.value)} className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer p-0 border-0 opacity-0" />
                                    </div>
                                    <input type="text" value={canvasProps.bg} onChange={(e) => updateCanvas('bg', e.target.value)} className="flex-1 bg-zinc-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none" />
                                    <button onClick={() => updateCanvas('bg', 'none')} className="text-[10px] px-2 py-1 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white">None</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>  
                        {/* Alignment Controls */}
                        <div className="space-y-3 pb-4 border-b border-white/5">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Alignment</h4>
                            <div className="grid grid-cols-6 gap-1 bg-zinc-800/50 rounded-lg p-1">
                                <button onClick={() => alignLayer('left')} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white flex justify-center" title="Align Left"><AlignLeft className="w-4 h-4" /></button>
                                <button onClick={() => alignLayer('center')} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white flex justify-center" title="Align Center"><AlignCenter className="w-4 h-4" /></button>
                                <button onClick={() => alignLayer('right')} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white flex justify-center" title="Align Right"><AlignRight className="w-4 h-4" /></button>
                                <div className="w-px bg-white/5 my-1"></div>
                                <button onClick={() => alignLayer('top')} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white flex justify-center" title="Align Top"><ArrowUpToLine className="w-4 h-4" /></button>
                                <button onClick={() => alignLayer('middle')} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white flex justify-center" title="Align Middle"><AlignCenter className="w-4 h-4 rotate-90" /></button>
                                <button onClick={() => alignLayer('bottom')} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white flex justify-center" title="Align Bottom"><ArrowDownToLine className="w-4 h-4" /></button>
                            </div>
                        </div>

                        {/* Position Controls */}
                        {(['rect', 'circle', 'ellipse', 'text', 'image'].includes(selectedTagName.toLowerCase())) && (
                            <div className="space-y-3 pb-4 border-b border-white/5">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Crosshair className="w-3 h-3" /> Position</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 mb-1 block">X Axis</label>
                                        <input type="number" value={styleProps.x} onChange={(e) => updateStyle('x', e.target.value)} className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 mb-1 block">Y Axis</label>
                                        <input type="number" value={styleProps.y} onChange={(e) => updateStyle('y', e.target.value)} className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Rect Controls */}
                        {selectedTagName.toLowerCase() === 'rect' && (
                            <div className="space-y-3 pb-4 border-b border-white/5">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Box className="w-3 h-3" /> Shape Properties</h4>
                                <div>
                                    <div className="flex justify-between text-xs text-zinc-400 mb-1"><span>Corner Radius</span><span>{styleProps.rx}px</span></div>
                                    <input type="range" min="0" max="100" step="1" value={parseFloat(styleProps.rx)} onChange={(e) => updateStyle('rx', e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                            </div>
                        )}

                        {/* Typography */}
                        {selectedTagName.toLowerCase() === 'text' && (
                            <div className="space-y-3 pb-4 border-b border-white/5">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><TypeIcon className="w-3 h-3" /> Typography</h4>
                                <div>
                                    <label className="text-xs text-zinc-400 mb-2 block">Content</label>
                                    <input type="text" value={styleProps.textContent} onChange={(e) => updateStyle('textContent', e.target.value)} className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-400 mb-2 block">Font Family</label>
                                    <select value={styleProps.fontFamily.replace(/['"]/g, '')} onChange={(e) => updateStyle('font-family', e.target.value)} className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none appearance-none">
                                        {WEB_SAFE_FONTS.map(font => <option key={font} value={font}>{font}</option>)}
                                        <option value="sans-serif">Sans Serif</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 mb-1 block">Size (px)</label>
                                        <input type="number" value={styleProps.fontSize} onChange={(e) => updateStyle('font-size', e.target.value)} className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 mb-1 block">Weight</label>
                                        <select value={styleProps.fontWeight} onChange={(e) => updateStyle('font-weight', e.target.value)} className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-indigo-500 focus:outline-none appearance-none">
                                            {FONT_WEIGHTS.map(w => <option key={w} value={w}>{w}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Appearance (Fill, Stroke, Blend) */}
                        <div className="space-y-4 pb-4 border-b border-white/5">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Appearance</h4>
                            
                            {/* Fill */}
                            <div>
                                <label className="text-xs text-zinc-400 mb-2 block">Fill</label>
                                <div className="flex bg-zinc-800/50 rounded-lg p-1 border border-white/5 mb-3">
                                    <button onClick={() => { setFillType('solid'); updateStyle('fill', '#000000'); }} className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-all ${fillType === 'solid' ? 'bg-zinc-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>Solid</button>
                                    <button onClick={() => applyGradient('linear', gradientProps.start, gradientProps.end)} className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-all ${fillType === 'linear' ? 'bg-zinc-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>Linear</button>
                                    <button onClick={() => applyGradient('radial', gradientProps.start, gradientProps.end)} className={`flex-1 py-1.5 text-[10px] font-medium rounded transition-all ${fillType === 'radial' ? 'bg-zinc-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>Radial</button>
                                </div>
                                {fillType === 'solid' ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2 items-center">
                                            <div className="relative w-8 h-8 rounded overflow-hidden border border-white/10 bg-zinc-800 flex-shrink-0">
                                                <div className="absolute inset-0 bg-[image:linear-gradient(45deg,#3f3f46_25%,transparent_25%,transparent_75%,#3f3f46_75%,#3f3f46)] bg-[size:6px_6px] bg-[position:0_0,3px_3px] opacity-20" />
                                                <div className="absolute inset-0" style={{ backgroundColor: styleProps.fill === 'none' ? 'transparent' : styleProps.fill, opacity: styleProps.fill === 'none' ? 1 : styleProps.fillOpacity }} />
                                                <input type="color" value={toHex(styleProps.fill)} onChange={(e) => updateStyle('fill', e.target.value)} className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer p-0 border-0 opacity-0" />
                                            </div>
                                            <input type="text" value={styleProps.fill} onChange={(e) => updateStyle('fill', e.target.value)} className="flex-1 min-w-0 bg-zinc-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none" />
                                        </div>
                                        {styleProps.fill !== 'none' && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <label className="text-[10px] text-zinc-500 w-8">Opacity</label>
                                                <input type="range" min="0" max="1" step="0.1" value={styleProps.fillOpacity} onChange={(e) => updateStyle('fill-opacity', e.target.value)} className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-zinc-500 mb-1 block">Start</label>
                                            <div className="relative w-6 h-6 rounded border border-white/10"><div className="absolute inset-0" style={{ backgroundColor: gradientProps.start }} /><input type="color" value={gradientProps.start} onChange={(e) => applyGradient(fillType === 'radial' ? 'radial' : 'linear', e.target.value, gradientProps.end)} className="absolute inset-0 opacity-0 cursor-pointer" /></div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-zinc-500 mb-1 block">End</label>
                                            <div className="relative w-6 h-6 rounded border border-white/10"><div className="absolute inset-0" style={{ backgroundColor: gradientProps.end }} /><input type="color" value={gradientProps.end} onChange={(e) => applyGradient(fillType === 'radial' ? 'radial' : 'linear', gradientProps.start, e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" /></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Stroke */}
                            <div>
                                <label className="text-xs text-zinc-400 mb-1.5 block">Stroke</label>
                                <div className="flex gap-2 items-center mb-2">
                                    <div className="relative w-6 h-6 rounded overflow-hidden border border-white/10 bg-zinc-800 flex-shrink-0">
                                        <div className="absolute inset-0" style={{ backgroundColor: styleProps.stroke === 'none' ? 'transparent' : styleProps.stroke }} />
                                        <input type="color" value={toHex(styleProps.stroke)} onChange={(e) => updateStyle('stroke', e.target.value)} className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer p-0 border-0 opacity-0" />
                                    </div>
                                    <input type="text" value={styleProps.stroke} onChange={(e) => updateStyle('stroke', e.target.value)} className="flex-1 min-w-0 bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none" />
                                    <input type="number" min="0" max="50" step="0.5" value={parseFloat(styleProps.strokeWidth)} onChange={(e) => updateStyle('stroke-width', e.target.value)} className="w-12 bg-zinc-800 border border-white/10 rounded px-1 py-1 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                     <select value={styleProps.strokeLinecap} onChange={(e) => updateStyle('stroke-linecap', e.target.value)} className="bg-zinc-800 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white">
                                         {STROKE_CAPS.map(c => <option key={c} value={c}>Cap: {c}</option>)}
                                     </select>
                                     <select value={styleProps.strokeLinejoin} onChange={(e) => updateStyle('stroke-linejoin', e.target.value)} className="bg-zinc-800 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white">
                                         {STROKE_JOINS.map(j => <option key={j} value={j}>Join: {j}</option>)}
                                     </select>
                                     <select value={styleProps.strokeDasharray} onChange={(e) => updateStyle('stroke-dasharray', e.target.value)} className="bg-zinc-800 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white col-span-2">
                                         {STROKE_DASHES.map(d => <option key={d.value} value={d.value}>Pattern: {d.label}</option>)}
                                     </select>
                                </div>
                            </div>
                            
                            {/* Blend Mode */}
                            <div>
                                <label className="text-xs text-zinc-400 mb-1.5 block">Blend Mode</label>
                                <select value={styleProps.blendMode} onChange={(e) => updateStyle('blendMode', e.target.value)} className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none appearance-none">
                                    {BLEND_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-zinc-400 mb-1.5 block">Global Opacity</label>
                                <div className="flex items-center gap-2">
                                    <input type="range" min="0" max="1" step="0.1" value={styleProps.opacity} onChange={(e) => updateStyle('opacity', e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    <span className="text-xs font-mono text-zinc-500 w-8 text-right">{styleProps.opacity}</span>
                                </div>
                            </div>
                        </div>

                        {/* Transform & Effects */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Move className="w-3 h-3" /> Transform & Effects</h4>
                            
                            <div>
                                <div className="flex justify-between text-xs text-zinc-400 mb-1"><span>Rotation</span><span>{styleProps.rotate}°</span></div>
                                <input type="range" min="0" max="360" step="1" value={styleProps.rotate} onChange={(e) => updateStyle('rotate', e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                            </div>

                            <div>
                                <div className="flex justify-between text-xs text-zinc-400 mb-1"><span>Scale</span><span>{styleProps.scale}x</span></div>
                                <input type="range" min="0.1" max="3" step="0.1" value={styleProps.scale} onChange={(e) => updateStyle('scale', e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                            </div>

                             <div className="flex gap-2">
                                <button onClick={() => updateStyle('flipX', !styleProps.flipX)} className={`flex-1 py-1.5 rounded text-[10px] flex items-center justify-center gap-1 ${styleProps.flipX ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                                    <FlipHorizontal className="w-3 h-3" /> Flip H
                                </button>
                                <button onClick={() => updateStyle('flipY', !styleProps.flipY)} className={`flex-1 py-1.5 rounded text-[10px] flex items-center justify-center gap-1 ${styleProps.flipY ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                                    <FlipVertical className="w-3 h-3" /> Flip V
                                </button>
                            </div>
                        </div>

                         {/* Filters */}
                         <div className="space-y-4 pb-4 border-t border-white/5 pt-4">
                             <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Wand2 className="w-3 h-3" /> Filters</h4>
                             
                             <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-xs text-zinc-400 mb-1"><span>Blur</span><span>{styleProps.blur}px</span></div>
                                    <input type="range" min="0" max="20" step="0.5" value={styleProps.blur} onChange={(e) => updateStyle('blur', e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-zinc-400 mb-1"><span>Grayscale</span><span>{Math.round(parseFloat(styleProps.grayscale)*100)}%</span></div>
                                    <input type="range" min="0" max="1" step="0.1" value={styleProps.grayscale} onChange={(e) => updateStyle('grayscale', e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-zinc-400 mb-1"><span>Sepia</span><span>{Math.round(parseFloat(styleProps.sepia)*100)}%</span></div>
                                    <input type="range" min="0" max="1" step="0.1" value={styleProps.sepia} onChange={(e) => updateStyle('sepia', e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-zinc-400 mb-1"><span>Saturate</span><span>{Math.round(parseFloat(styleProps.saturate)*100)}%</span></div>
                                    <input type="range" min="0" max="3" step="0.1" value={styleProps.saturate} onChange={(e) => updateStyle('saturate', e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-zinc-400 mb-1"><span>Hue Rotate</span><span>{styleProps.hueRotate}°</span></div>
                                    <input type="range" min="0" max="360" step="10" value={styleProps.hueRotate} onChange={(e) => updateStyle('hueRotate', e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-400">Invert Colors</span>
                                    <button 
                                        onClick={() => updateStyle('invert', styleProps.invert === '1' ? '0' : '1')} 
                                        className={`w-10 h-5 rounded-full relative transition-colors ${styleProps.invert === '1' ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${styleProps.invert === '1' ? 'translate-x-5' : ''}`} />
                                    </button>
                                </div>
                             </div>

                             {/* Drop Shadow */}
                            <div className="pt-4 border-t border-white/5">
                                <label className="flex items-center gap-2 text-xs text-zinc-400 mb-2 cursor-pointer">
                                    <input type="checkbox" checked={shadowProps.enabled} onChange={(e) => updateShadow({...shadowProps, enabled: e.target.checked})} className="rounded bg-zinc-800 border-white/10 text-indigo-500 focus:ring-0" />
                                    Drop Shadow
                                </label>
                                {shadowProps.enabled && (
                                    <div className="space-y-2 pl-5">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label className="text-[10px] text-zinc-500">X</label><input type="number" value={shadowProps.x} onChange={(e) => updateShadow({...shadowProps, x: parseFloat(e.target.value)})} className="w-full bg-zinc-800 rounded px-1 py-0.5 text-xs text-white" /></div>
                                            <div><label className="text-[10px] text-zinc-500">Y</label><input type="number" value={shadowProps.y} onChange={(e) => updateShadow({...shadowProps, y: parseFloat(e.target.value)})} className="w-full bg-zinc-800 rounded px-1 py-0.5 text-xs text-white" /></div>
                                        </div>
                                        <div><label className="text-[10px] text-zinc-500">Blur</label><input type="range" min="0" max="20" value={shadowProps.blur} onChange={(e) => updateShadow({...shadowProps, blur: parseFloat(e.target.value)})} className="w-full h-1 bg-zinc-700 rounded-lg accent-indigo-500" /></div>
                                        <div>
                                            <label className="text-[10px] text-zinc-500">Color</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="relative w-5 h-5 rounded border border-white/10"><div className="absolute inset-0" style={{ backgroundColor: shadowProps.color }} /><input type="color" value={shadowProps.color} onChange={(e) => updateShadow({...shadowProps, color: e.target.value})} className="absolute inset-0 opacity-0 cursor-pointer" /></div>
                                                <input type="range" min="0" max="1" step="0.1" value={shadowProps.opacity} onChange={(e) => updateShadow({...shadowProps, opacity: parseFloat(e.target.value)})} className="flex-1 h-1 bg-zinc-700 rounded-lg accent-indigo-500" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        )}

        {/* TOOLS TAB */}
        {activeTab === 'tools' && (
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Add Elements</p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => addShape('rect')} className="aspect-square flex flex-col items-center justify-center bg-zinc-800/40 hover:bg-zinc-800 border border-white/5 hover:border-indigo-500/50 rounded-lg transition-all group" title="Rectangle"><Square className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400 transition-colors" /></button>
                <button onClick={() => addShape('circle')} className="aspect-square flex flex-col items-center justify-center bg-zinc-800/40 hover:bg-zinc-800 border border-white/5 hover:border-pink-500/50 rounded-lg transition-all group" title="Circle"><Circle className="w-5 h-5 text-zinc-400 group-hover:text-pink-400 transition-colors" /></button>
                <button onClick={() => addShape('ellipse')} className="aspect-square flex flex-col items-center justify-center bg-zinc-800/40 hover:bg-zinc-800 border border-white/5 hover:border-violet-500/50 rounded-lg transition-all group" title="Ellipse"><Circle className="w-5 h-5 text-zinc-400 group-hover:text-violet-400 scale-x-125 transition-colors" /></button>
                <button onClick={() => addShape('triangle')} className="aspect-square flex flex-col items-center justify-center bg-zinc-800/40 hover:bg-zinc-800 border border-white/5 hover:border-amber-500/50 rounded-lg transition-all group" title="Triangle"><Triangle className="w-5 h-5 text-zinc-400 group-hover:text-amber-400 transition-colors" /></button>
                <button onClick={() => addShape('star')} className="aspect-square flex flex-col items-center justify-center bg-zinc-800/40 hover:bg-zinc-800 border border-white/5 hover:border-yellow-500/50 rounded-lg transition-all group" title="Star"><Star className="w-5 h-5 text-zinc-400 group-hover:text-yellow-400 transition-colors" /></button>
                <button onClick={() => addShape('heart')} className="aspect-square flex flex-col items-center justify-center bg-zinc-800/40 hover:bg-zinc-800 border border-white/5 hover:border-red-500/50 rounded-lg transition-all group" title="Heart"><Heart className="w-5 h-5 text-zinc-400 group-hover:text-red-400 transition-colors" /></button>
                <button onClick={() => addShape('arrow')} className="aspect-square flex flex-col items-center justify-center bg-zinc-800/40 hover:bg-zinc-800 border border-white/5 hover:border-blue-500/50 rounded-lg transition-all group" title="Arrow"><ArrowIcon className="w-5 h-5 text-zinc-400 group-hover:text-blue-400 transition-colors" /></button>
                <button onClick={() => addShape('bubble')} className="aspect-square flex flex-col items-center justify-center bg-zinc-800/40 hover:bg-zinc-800 border border-white/5 hover:border-green-500/50 rounded-lg transition-all group" title="Bubble"><MessageCircle className="w-5 h-5 text-zinc-400 group-hover:text-green-400 transition-colors" /></button>
                <button onClick={() => addShape('text')} className="aspect-square flex flex-col items-center justify-center bg-zinc-800/40 hover:bg-zinc-800 border border-white/5 hover:border-emerald-500/50 rounded-lg transition-all group" title="Text"><Type className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 transition-colors" /></button>
              </div>
              
              <button onClick={() => fileInputRef.current?.click()} className="w-full mt-3 flex items-center justify-center gap-2 p-3 bg-zinc-800/40 hover:bg-zinc-800 border border-white/5 hover:border-blue-500/50 rounded-xl transition-all group">
                    <ImageIcon className="w-4 h-4 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                    <span className="text-xs font-medium text-zinc-300">Upload Image</span>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </button>
            </div>
            
            <div className="bg-indigo-900/10 border border-indigo-500/10 rounded-xl p-4">
                <p className="text-[10px] text-indigo-300/80 leading-relaxed">
                    <strong>Tip:</strong> New elements are added to the center. Switch to the <b>Style</b> tab to modify them.
                </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
