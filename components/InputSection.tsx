
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef } from 'react';
import { Wand2, Sparkles, Upload, PlayCircle, History, PenTool, ChevronDown, Ban, X, Zap, Box, Settings2, MessageSquarePlus, Globe, Key, Check, ArrowLeft } from 'lucide-react';
import { GenerationStatus, GenerationOptions, GeneratedSvg, ModelConfig } from '../types';

interface InputSectionProps {
  onGenerate: (options: GenerationOptions) => void;
  onRefine?: (instruction: string) => void;
  status: GenerationStatus;
  history: GeneratedSvg[];
  onSelectHistory: (svg: GeneratedSvg) => void;
  selectedId?: string;
  modelConfig: ModelConfig;
  onConfigChange: (config: ModelConfig) => void;
  onCloseMobile?: () => void;
}

const STYLES = [
  'Flat', 
  'Material', 
  'Isometric', 
  'Line Art', 
  'Cyberpunk', 
  'Minimalist',
  'Hand Drawn'
];

const RATIOS = [
  { label: '1:1', value: '1:1', title: 'Square' },
  { label: '4:3', value: '4:3', title: 'Standard' },
  { label: '16:9', value: '16:9', title: 'Wide' },
  { label: '9:16', value: '9:16', title: 'Portrait' },
];

const COMPLEXITY = [
  'Minimal',
  'Medium',
  'Detailed'
];

const THEMES = [
  'None',
  'Vibrant',
  'Pastel',
  'Neon',
  'Earth Tones',
  'Dark Mode',
  'Grayscale',
  'Complementary'
];

const STROKES = [
  'Standard',
  'Variable Width',
  'Sketchy',
  'Dashed',
  'Thick',
  'None (Fill Only)'
];

const VIEWPOINTS = [
    'None',
    'Front',
    'Isometric',
    'Top Down',
    'Side Profile',
    'Macro Close-up',
    'Wide Angle'
];

const MOODS = [
    'None',
    'Professional',
    'Playful',
    'Mysterious',
    'Energetic',
    'Calm',
    'Retro',
    'Futuristic',
    'Neutral'
];

const PRESETS = [
    { name: 'Tech Logo', style: 'Flat', complexity: 'Minimal', stroke: 'Thick', ratio: '1:1', viewpoint: 'Front', mood: 'Professional', theme: 'Vibrant' },
    { name: 'Isometric World', style: 'Isometric', complexity: 'Detailed', stroke: 'Standard', ratio: '4:3', viewpoint: 'Isometric', mood: 'Playful', theme: 'None' },
    { name: 'Linear Icon', style: 'Line Art', complexity: 'Minimal', stroke: 'Standard', ratio: '1:1', viewpoint: 'Front', mood: 'Neutral', theme: 'None' },
    { name: 'Neon Cyberpunk', style: 'Cyberpunk', complexity: 'Detailed', stroke: 'Variable Width', ratio: '16:9', viewpoint: 'Wide Angle', mood: 'Futuristic', theme: 'Neon' },
    { name: 'Hand Sketch', style: 'Hand Drawn', complexity: 'Medium', stroke: 'Sketchy', ratio: '4:3', viewpoint: 'Front', mood: 'Retro', theme: 'Earth Tones' }
];

const RANDOM_PROMPTS = [
  "A futuristic city inside a lightbulb",
  "A cute robot watering a flower",
  "An isometric cozy coffee shop",
  "A geometric lion head logo",
  "A steampunk octopus deep sea diver",
  "A minimalist mountain landscape at sunset",
  "A retro cassette tape with neon colors",
  "A sleeping cat on a stack of books",
  "A cyberpunk street food vendor",
  "A magical treehouse with glowing lanterns",
  "A low-poly fox running in the snow",
  "A vintage camera with floral decorations",
  "A rocket ship launching from a pizza planet",
  "A zen garden with a meditating panda",
  "An astronaut playing a guitar in space",
  "A detailed mechanical dragonfly",
  "A cozy cabin in the woods during autumn",
  "A neon-lit arcade machine from the 80s",
  "A whimsical hot air balloon festival",
  "A samurai warrior silhouette against a red sun",
  "A crystal clear potion bottle with a galaxy inside",
  "A stylized map of a fantasy kingdom",
  "A retro vinyl record player with floating notes",
  "A cyberpunk motorcycle racing on a grid",
  "A peaceful lighthouse on a jagged cliff",
  "A detailed origami crane",
  "A futuristic drone delivering a package",
  "A majestic phoenix rising from ashes",
  "A cute corgi wearing sunglasses on a surfboard",
  "A mystical portal in a dark forest",
  "A coffee cup with ocean waves inside",
  "A geometric owl with vibrant feathers",
  "A vintage typewriter with flying letters",
  "A floating island with a waterfall"
];

const OPENROUTER_MODELS = [
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
    { id: 'google/gemini-2.0-pro-exp-02-05:free', name: 'Gemini 2.0 Pro (Free)' },
    { id: 'x-ai/grok-2-vision-1212', name: 'Grok 2 Vision' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1' },
    { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air (Free)' }
];

export const InputSection: React.FC<InputSectionProps> = ({ 
    onGenerate, onRefine, status, history, onSelectHistory, selectedId, modelConfig, onConfigChange, onCloseMobile 
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [input, setInput] = useState('');
  const [refineInput, setRefineInput] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366f1');
  
  // Settings Dialog
  const [showSettings, setShowSettings] = useState(false);
  const [tempConfig, setTempConfig] = useState<ModelConfig>(modelConfig);

  // New State Variables
  const [selectedStyle, setSelectedStyle] = useState('Flat');
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [selectedComplexity, setSelectedComplexity] = useState('Medium');
  const [selectedTheme, setSelectedTheme] = useState('None');
  const [selectedStroke, setSelectedStroke] = useState('Standard');
  const [selectedViewpoint, setSelectedViewpoint] = useState('None');
  const [selectedMood, setSelectedMood] = useState('None');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isAnimated, setIsAnimated] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (status === GenerationStatus.LOADING) return;

    const options: GenerationOptions = {
        prompt: input.trim(),
        color: selectedColor,
        style: selectedStyle,
        ratio: selectedRatio,
        complexity: selectedComplexity,
        animated: isAnimated,
        theme: selectedTheme,
        stroke: selectedStroke,
        negativePrompt: negativePrompt.trim(),
        viewpoint: selectedViewpoint,
        mood: selectedMood,
        modelConfig: modelConfig // Pass config here
    };

    if (mode === 'text' && input.trim()) {
      onGenerate(options);
    } else if (mode === 'image' && uploadedImage) {
      onGenerate({ ...options, image: uploadedImage });
    }
  };

  const handleRefineSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (refineInput.trim() && onRefine) {
          onRefine(refineInput);
          setRefineInput('');
      }
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
      setSelectedStyle(preset.style);
      setSelectedComplexity(preset.complexity);
      setSelectedStroke(preset.stroke);
      setSelectedRatio(preset.ratio);
      setSelectedViewpoint(preset.viewpoint);
      setSelectedMood(preset.mood);
      setSelectedTheme(preset.theme);
  };

  const handleRandomPrompt = () => {
      const random = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
      setInput(random);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  
  const saveSettings = () => {
      onConfigChange(tempConfig);
      setShowSettings(false);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 relative">
        {/* Settings Modal */}
        {showSettings && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 animate-in fade-in flex items-center justify-center">
                <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Settings2 className="w-4 h-4" /> Model Settings
                        </h3>
                        <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4"/></button>
                    </div>
                    <div className="p-4 space-y-4">
                        {/* Provider Selection */}
                        <div className="space-y-2">
                             <label className="text-[10px] uppercase font-bold text-zinc-500">AI Provider</label>
                             <div className="grid grid-cols-2 gap-2">
                                 <button 
                                    onClick={() => setTempConfig({...tempConfig, provider: 'google', model: 'gemini-3-pro-preview'})}
                                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-2 ${tempConfig.provider === 'google' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800 border-white/10 text-zinc-400 hover:bg-zinc-700'}`}
                                 >
                                     <Sparkles className="w-3 h-3" /> Google Gemini
                                 </button>
                                 <button 
                                    onClick={() => setTempConfig({...tempConfig, provider: 'openrouter', model: 'google/gemini-2.0-flash-exp:free'})}
                                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-2 ${tempConfig.provider === 'openrouter' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800 border-white/10 text-zinc-400 hover:bg-zinc-700'}`}
                                 >
                                     <Globe className="w-3 h-3" /> OpenRouter
                                 </button>
                             </div>
                        </div>

                        {/* OpenRouter Config */}
                        {tempConfig.provider === 'openrouter' && (
                            <div className="space-y-4 animate-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500">API Key</label>
                                    <div className="relative">
                                        <input 
                                            type="password"
                                            value={tempConfig.apiKey || ''}
                                            onChange={(e) => setTempConfig({...tempConfig, apiKey: e.target.value})}
                                            placeholder="sk-or-..."
                                            className="w-full bg-zinc-950 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                                        />
                                        <Key className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                                    </div>
                                    <p className="text-[10px] text-zinc-600">Key is stored locally in your browser.</p>
                                </div>
                                
                                <div className="space-y-2">
                                     <label className="text-[10px] uppercase font-bold text-zinc-500">Model</label>
                                     <select 
                                        value={tempConfig.model}
                                        onChange={(e) => setTempConfig({...tempConfig, model: e.target.value})}
                                        className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                                     >
                                         {OPENROUTER_MODELS.map(m => (
                                             <option key={m.id} value={m.id}>{m.name}</option>
                                         ))}
                                         <option value="custom">Custom...</option>
                                     </select>
                                     {/* Allow custom text input if not in list or just always allow override */}
                                     {!OPENROUTER_MODELS.find(m => m.id === tempConfig.model) && (
                                         <input 
                                            type="text"
                                            value={tempConfig.model}
                                            onChange={(e) => setTempConfig({...tempConfig, model: e.target.value})}
                                            placeholder="vendor/model-name"
                                            className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none mt-2"
                                         />
                                     )}
                                </div>
                            </div>
                        )}

                        {/* Google Config */}
                        {tempConfig.provider === 'google' && (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-[10px] uppercase font-bold text-zinc-500">Model</label>
                                <select 
                                    value={tempConfig.model}
                                    onChange={(e) => setTempConfig({...tempConfig, model: e.target.value})}
                                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                                >
                                    <option value="gemini-3-pro-preview">Gemini 3.0 Pro</option>
                                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                </select>
                            </div>
                        )}
                        
                        <button onClick={saveSettings} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors">
                            Save Settings
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* App Branding & Header */}
        <div className="h-14 flex items-center px-5 border-b border-white/10 gap-3 flex-shrink-0 justify-between">
             <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <PenTool className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                    <h1 className="text-sm font-bold text-white leading-none">SVG ORA Studio</h1>
                    <p className="text-[10px] text-zinc-500 font-medium truncate max-w-[100px]">
                        {modelConfig.provider === 'google' ? 'Gemini Native' : 'OpenRouter'}
                    </p>
                </div>
             </div>
             <div className="flex items-center gap-1">
                 <button 
                    onClick={() => { setTempConfig(modelConfig); setShowSettings(true); }}
                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Model Settings"
                >
                     <Settings2 className="w-4 h-4" />
                 </button>
                 {onCloseMobile && (
                     <button 
                        onClick={onCloseMobile}
                        className="md:hidden p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Close Sidebar"
                     >
                         <X className="w-5 h-5" />
                     </button>
                 )}
             </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-2 gap-1 border-b border-white/5 flex-shrink-0">
            <button 
                onClick={() => setActiveTab('create')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${activeTab === 'create' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
            >
                <Wand2 className="w-3.5 h-3.5" /> Create
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all ${activeTab === 'history' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
            >
                <History className="w-3.5 h-3.5" /> History <span className="opacity-50 text-[10px]">({history.length})</span>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'create' ? (
                <div className="p-5 space-y-6">
                    
                    {/* Presets */}
                    <div className="space-y-2">
                         <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Presets:</label>
                         <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
                            {PRESETS.map(p => (
                                <button 
                                    key={p.name} 
                                    onClick={() => handleApplyPreset(p)} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-white/10 hover:border-indigo-500/50 hover:bg-zinc-800 transition-all whitespace-nowrap group"
                                >
                                    <Zap className="w-3 h-3 text-zinc-500 group-hover:text-yellow-400 transition-colors" />
                                    <span className="text-[10px] font-medium text-zinc-400 group-hover:text-white">{p.name}</span>
                                </button>
                            ))}
                         </div>
                    </div>

                    {/* Main Input */}
                    <div className="space-y-2">
                        {mode === 'text' ? (
                            <div className="relative">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="e.g. A retro rocket ship..."
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-4 pb-12 text-sm text-white placeholder-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none min-h-[120px]"
                                />
                                <div className="absolute bottom-3 right-3 flex gap-2">
                                     <button 
                                        onClick={handleRandomPrompt}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800/80 backdrop-blur hover:bg-zinc-700 rounded-lg border border-white/5 text-[10px] text-zinc-300 transition-all"
                                     >
                                         <Sparkles className="w-3 h-3 text-indigo-400" /> Surprise Me
                                     </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-zinc-900/50 transition-colors relative overflow-hidden group">
                                    {uploadedImage ? (
                                        <>
                                            <img src={uploadedImage} alt="ref" className="w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <span className="text-xs font-medium text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur">Change Image</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-6 h-6 text-zinc-500 mb-2" />
                                            <span className="text-xs text-zinc-400">Click to upload reference</span>
                                        </>
                                    )}
                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                </div>
                                <input 
                                    type="text" 
                                    value={input} 
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Optional instructions..."
                                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                                />
                            </div>
                        )}
                        <div className="flex justify-end">
                             <button onClick={() => setMode(mode === 'text' ? 'image' : 'text')} className="text-[10px] text-zinc-500 hover:text-indigo-400 transition-colors underline decoration-dotted">
                                 {mode === 'text' ? 'Switch to Image Input' : 'Switch to Text Input'}
                             </button>
                        </div>
                    </div>

                    {/* Config Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                        {/* Style */}
                        <div className="space-y-1.5 col-span-2">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1"><Wand2 className="w-3 h-3" /> Style</span>
                            <div className="flex flex-wrap gap-1.5">
                                {STYLES.map(s => (
                                    <button 
                                        key={s} 
                                        onClick={() => setSelectedStyle(s)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] border transition-all ${selectedStyle === s ? 'bg-white text-black border-white font-medium' : 'bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/30'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color & Theme */}
                        <div className="space-y-1.5">
                            <span className="text-sm text-zinc-400 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-zinc-600" /> Color</span>
                            <div className="flex items-center gap-2 bg-zinc-900 p-1.5 rounded-lg border border-white/10">
                                <div className="w-8 h-6 rounded bg-gradient-to-br from-white/10 to-transparent relative overflow-hidden">
                                     <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 opacity-0 cursor-pointer" />
                                     <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: selectedColor }}></div>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-500 flex-1">{selectedColor}</span>
                            </div>
                        </div>

                         <div className="space-y-1.5">
                             <span className="text-sm text-zinc-400">Theme</span>
                             <div className="relative">
                                <select value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)} className="w-full bg-zinc-900 text-xs text-white border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 appearance-none">
                                    {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                             </div>
                        </div>

                        {/* Ratio */}
                        <div className="space-y-1.5 col-span-2">
                             <div className="flex justify-between items-center">
                                <span className="text-sm text-zinc-400 flex items-center gap-2"><Box className="w-3.5 h-3.5 text-zinc-600" /> Ratio</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-500 flex items-center gap-1"><PlayCircle className="w-3 h-3" /> Animate</span>
                                    <button onClick={() => setIsAnimated(!isAnimated)} className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isAnimated ? 'bg-indigo-500' : 'bg-zinc-800'}`}>
                                        <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${isAnimated ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                    <span className="text-[10px] w-6 text-zinc-500">{isAnimated ? 'On' : 'Off'}</span>
                                </div>
                             </div>
                             <div className="grid grid-cols-4 gap-2">
                                 {RATIOS.map(r => (
                                     <button 
                                        key={r.value} 
                                        onClick={() => setSelectedRatio(r.value)} 
                                        className={`py-2 rounded-lg border text-[10px] flex flex-col items-center gap-0.5 transition-all ${selectedRatio === r.value ? 'bg-zinc-800 border-indigo-500/50 text-white' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/10 hover:bg-zinc-800'}`}
                                        title={r.title}
                                    >
                                         <span className="font-medium">{r.label}</span>
                                     </button>
                                 ))}
                             </div>
                        </div>

                        {/* Complexity */}
                        <div className="space-y-1.5 col-span-2">
                            <span className="text-sm text-zinc-400 flex items-center gap-2"><History className="w-3.5 h-3.5 text-zinc-600" /> Complexity</span>
                             <div className="flex bg-zinc-900 rounded-lg border border-white/10 p-1">
                                 {COMPLEXITY.map(c => (
                                     <button key={c} onClick={() => setSelectedComplexity(c)} className={`flex-1 py-1.5 text-[10px] rounded transition-all ${selectedComplexity === c ? 'bg-zinc-700 text-white font-medium shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                         {c}
                                     </button>
                                 ))}
                             </div>
                        </div>

                        {/* Viewpoint & Mood */}
                        <div className="space-y-1.5 col-span-2">
                            <span className="text-sm text-zinc-400 flex items-center gap-2"><Upload className="w-3.5 h-3.5 text-zinc-600" /> Viewpoint</span>
                            <div className="relative">
                                <select value={selectedViewpoint} onChange={(e) => setSelectedViewpoint(e.target.value)} className="w-full bg-zinc-900 text-xs text-white border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 appearance-none">
                                    {VIEWPOINTS.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                            </div>
                        </div>

                         <div className="space-y-1.5 col-span-2">
                            <span className="text-sm text-zinc-400 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-zinc-600" /> Mood</span>
                             <div className="relative">
                                <select value={selectedMood} onChange={(e) => setSelectedMood(e.target.value)} className="w-full bg-zinc-900 text-xs text-white border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 appearance-none">
                                    {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                             </div>
                        </div>

                    </div>

                    {/* Advanced Settings Toggle */}
                    <div className="pt-4 border-t border-white/5">
                        <button 
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white transition-colors w-full"
                        >
                            <Settings2 className="w-4 h-4" />
                            Advanced Settings
                            {showAdvanced ? <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 ml-auto">Hide</span> : <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 ml-auto">Show</span>}
                        </button>
                        
                        {showAdvanced && (
                            <div className="mt-4 space-y-5 animate-in fade-in slide-in-from-top-2">
                                 {/* Stroke Style */}
                                 <div className="space-y-2">
                                     <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1"><PenTool className="w-3 h-3" /> Stroke Style</span>
                                     <div className="relative">
                                        <select value={selectedStroke} onChange={(e) => setSelectedStroke(e.target.value)} className="w-full bg-zinc-900 text-xs text-white border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-500 appearance-none">
                                            {STROKES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-2 top-3 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                                     </div>
                                 </div>

                                 {/* Negative Prompt */}
                                 <div className="space-y-2">
                                     <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1"><Ban className="w-3 h-3" /> Negative Prompt</span>
                                     <input 
                                        type="text"
                                        value={negativePrompt}
                                        onChange={(e) => setNegativePrompt(e.target.value)}
                                        placeholder="Elements to exclude (e.g. text, background, shading)"
                                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-indigo-500 outline-none"
                                     />
                                 </div>
                            </div>
                        )}
                    </div>

                </div>
            ) : (
                <div className="p-2 space-y-2">
                    {history.length === 0 ? (
                        <div className="text-center py-10 opacity-30">
                            <History className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-xs">No history yet</p>
                        </div>
                    ) : (
                        history.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onSelectHistory(item)}
                                className={`w-full text-left p-3 rounded-xl border transition-all flex gap-3 group ${
                                    selectedId === item.id 
                                    ? 'bg-zinc-800 border-indigo-500/50 shadow-md' 
                                    : 'bg-zinc-900/50 border-white/5 hover:border-white/10 hover:bg-zinc-800'
                                }`}
                            >
                                <div className="w-12 h-12 bg-zinc-950 rounded-lg flex items-center justify-center border border-white/5 overflow-hidden flex-shrink-0">
                                     <div className="scale-[2] opacity-80" dangerouslySetInnerHTML={{ __html: item.content }} />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <p className={`text-xs font-medium truncate ${selectedId === item.id ? 'text-white' : 'text-zinc-400'}`}>{item.prompt}</p>
                                    <p className="text-[10px] text-zinc-600 mt-1">{new Date(item.timestamp).toLocaleTimeString()}</p>
                                </div>
                                {selectedId === item.id && <Check className="w-4 h-4 text-indigo-400 self-center" />}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>

        {/* Action Footer */}
        <div className="p-5 border-t border-white/10 bg-zinc-950 flex-shrink-0 space-y-3">
            {/* Contextual Refine Input if we have history selected */}
            {selectedId && onRefine && (
                <form onSubmit={handleRefineSubmit} className="relative">
                    <div className="relative flex items-center">
                        <input 
                            type="text" 
                            value={refineInput}
                            onChange={(e) => setRefineInput(e.target.value)}
                            placeholder="Refine selected..."
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-3 pr-10 py-3 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 outline-none"
                        />
                         {refineInput && (
                             <button type="button" onClick={() => setRefineInput('')} className="absolute right-8 text-zinc-500 hover:text-white">
                                 <X className="w-3 h-3" />
                             </button>
                         )}
                        <button type="submit" disabled={!refineInput.trim() || status === GenerationStatus.LOADING} className="absolute right-1.5 p-1.5 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors">
                            <MessageSquarePlus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </form>
            )}

            {activeTab === 'create' && (
                <button 
                    onClick={handleSubmit}
                    disabled={status === GenerationStatus.LOADING || (mode === 'text' && !input) || (mode === 'image' && !uploadedImage)}
                    className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] active:scale-[0.98]"
                >
                    {status === GenerationStatus.LOADING ? (
                        <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div> Generating <span className="animate-pulse">...</span></>
                    ) : (
                        <><Wand2 className="w-4 h-4" /> Generate SVG</>
                    )}
                </button>
            )}
        </div>
    </div>
  );
};
