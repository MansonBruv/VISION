import React, { useState, useEffect, useRef } from 'react';
import { Plus, Image as ImageIcon, Type, Target, Sparkles, Download, LayoutTemplate, Upload, Trash2, RotateCcw } from 'lucide-react';
import { generateAffirmation, generateGoals, generateVisionImage } from './services/geminiService';
import { dbService } from './services/db';
import { BoardItemData, ItemType } from './types';
import { DraggableItem } from './components/DraggableItem';

const BOARD_WIDTH = 2000;
const BOARD_HEIGHT = 1500;

export default function App() {
  // State
  const [items, setItems] = useState<BoardItemData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'generate'>('create');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Inputs
  const [inputText, setInputText] = useState('');
  const [inputCategory, setInputCategory] = useState('General');
  
  // Viewport
  const boardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: -BOARD_WIDTH / 4, y: -BOARD_HEIGHT / 4 });

  // Load data from DB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedItems = await dbService.getAllItems();
        const storedBg = await dbService.getSetting('bgImage');
        
        if (storedItems.length > 0) {
          setItems(storedItems);
        } else {
          // New user experience: Clean slate (or optional onboarding items)
          // We leave it empty as requested "start a fresh".
          // If you want demo data only on VERY first run, you could check a 'visited' flag.
          // For now, we start empty to be truly "fresh".
        }

        if (storedBg) {
          setBgImage(storedBg);
        }
      } catch (err) {
        console.error("Failed to load from DB", err);
      } finally {
        setIsInitializing(false);
        
        // Center view
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        setPan({
            x: -(BOARD_WIDTH - viewportWidth) / 2,
            y: -(BOARD_HEIGHT - viewportHeight) / 2
        });
      }
    };
    loadData();
  }, []);

  // Board helpers with Persistence
  const addItem = (item: BoardItemData) => {
    setItems(prev => [...prev, item]);
    dbService.saveItem(item);
  };

  const updateItem = (id: string, updates: Partial<BoardItemData>) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        dbService.saveItem(updated);
        return updated;
      }
      return item;
    }));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    dbService.deleteItem(id);
  };

  const bringToFront = (id: string) => {
    setItems(prev => {
      const maxZ = Math.max(...prev.map(i => i.zIndex), 0);
      const updatedItems = prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, zIndex: maxZ + 1 };
          dbService.saveItem(updated); // Save new Z-index
          return updated;
        }
        return item;
      });
      return updatedItems;
    });
  };

  const handleResetBoard = async () => {
    if (window.confirm("Are you sure you want to clear your vision board? This cannot be undone.")) {
      await dbService.clearBoard();
      setItems([]);
      setBgImage(null);
    }
  };

  // Background Upload
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setBgImage(result);
        dbService.saveSetting('bgImage', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearBg = async () => {
    setBgImage(null);
    await dbService.saveSetting('bgImage', null);
  };

  // Generators
  const handleGenerateQuote = async () => {
    setLoading(true);
    try {
      const quote = await generateAffirmation(inputCategory);
      addItem({
        id: Date.now().toString(),
        type: ItemType.QUOTE,
        position: { x: BOARD_WIDTH / 2 - 150 + Math.random() * 100, y: BOARD_HEIGHT / 2 - 50 + Math.random() * 100 },
        zIndex: items.length + 1,
        content: quote,
        meta: { color: 'bg-blue-50/90' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateGoals = async () => {
    setLoading(true);
    try {
      const goals = await generateGoals(inputCategory);
      addItem({
        id: Date.now().toString(),
        type: ItemType.GOAL_LIST,
        position: { x: BOARD_WIDTH / 2 - 100 + Math.random() * 100, y: BOARD_HEIGHT / 2 + Math.random() * 100 },
        zIndex: items.length + 1,
        content: '',
        meta: { title: `2026 ${inputCategory} Goals`, items: goals }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!inputText) return;
    setLoading(true);
    try {
      const base64Image = await generateVisionImage(inputText);
      if (base64Image) {
        addItem({
          id: Date.now().toString(),
          type: ItemType.IMAGE,
          position: { x: BOARD_WIDTH / 2 - 150 + Math.random() * 100, y: BOARD_HEIGHT / 2 - 150 + Math.random() * 100 },
          zIndex: items.length + 1,
          content: base64Image,
          meta: { rotation: (Math.random() - 0.5) * 10, title: inputText }
        });
        setInputText('');
      }
    } catch (e) {
      alert("Failed to generate image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Manual Add
  const addNote = () => {
    addItem({
      id: Date.now().toString(),
      type: ItemType.NOTE,
      position: { x: BOARD_WIDTH / 2 - 100 + Math.random() * 50, y: BOARD_HEIGHT / 2 + Math.random() * 50 },
      zIndex: items.length + 1,
      content: inputText || "New Note",
      meta: { color: 'bg-yellow-100', rotation: (Math.random() - 0.5) * 6 }
    });
    setInputText('');
  };

  // Panning Logic
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handlePanDown = (e: React.MouseEvent) => {
    if (e.target === boardRef.current) {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePanUp = () => setIsPanning(false);

  if (isInitializing) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-100">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-serif">Loading your vision...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100">
      
      {/* Top Bar */}
      <header className="h-14 bg-white/80 backdrop-blur border-b flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="text-indigo-600" size={24} />
          <h1 className="font-serif font-bold text-xl text-slate-800">Vision 2026</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500">
           <span className="hidden lg:inline">Hold space or drag background to pan</span>
           
           <div className="flex items-center gap-2 bg-slate-100 rounded-full px-2 py-1">
             <button 
               onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
               className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-full transition-colors font-bold"
             >-</button>
             <span className="w-10 text-center text-xs font-medium">{Math.round(scale * 100)}%</span>
             <button 
               onClick={() => setScale(s => Math.min(2, s + 0.1))}
               className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-full transition-colors font-bold"
             >+</button>
           </div>

           <div className="h-6 w-px bg-slate-300 mx-2"></div>

           <button 
             onClick={handleResetBoard}
             className="flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium"
             title="Clear Board"
           >
             <RotateCcw size={14} />
             <span className="hidden sm:inline">Start Fresh</span>
           </button>
        </div>
      </header>

      <div className="flex-1 flex relative overflow-hidden">
        
        {/* Floating Toolbar (Left) */}
        <div className="absolute left-6 top-6 z-40 flex flex-col gap-4">
          <div className="bg-white/90 backdrop-blur-xl p-1 rounded-2xl shadow-xl border border-white/50 w-72 transition-all">
            
            <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
               <button 
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'create' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 Add Item
               </button>
               <button 
                onClick={() => setActiveTab('generate')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'generate' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 Ask AI
               </button>
            </div>

            <div className="px-3 pb-3">
              {activeTab === 'create' ? (
                <div className="space-y-3">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Content</label>
                      <textarea 
                        className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        rows={3}
                        placeholder="Type a note or URL..."
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      <button onClick={addNote} className="flex flex-col items-center justify-center p-3 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-xl transition-colors border border-yellow-200 text-center">
                        <Type size={20} className="mb-1" />
                        <span className="text-xs font-medium">Sticky Note</span>
                      </button>
                      <button 
                        onClick={() => {
                          if(!inputText) return alert("Enter an image URL");
                          addItem({
                            id: Date.now().toString(),
                            type: ItemType.IMAGE,
                            position: { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 },
                            zIndex: items.length + 1,
                            content: inputText,
                            meta: { title: 'Image' }
                          });
                          setInputText('');
                        }}
                        className="flex flex-col items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors border border-blue-200 text-center"
                      >
                        <ImageIcon size={20} className="mb-1" />
                        <span className="text-xs font-medium">Add Image URL</span>
                      </button>
                   </div>
                   
                   <div className="pt-2 border-t border-slate-100 mt-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Background</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Upload size={16} />
                            <span>Upload</span>
                        </button>
                        {bgImage && (
                            <button
                                onClick={handleClearBg}
                                className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                                title="Remove background"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleBgUpload}
                    />
                   </div>
                </div>
              ) : (
                <div className="space-y-3">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topic / Category</label>
                      <select 
                        className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none"
                        value={inputCategory}
                        onChange={(e) => setInputCategory(e.target.value)}
                      >
                        <option value="General">General</option>
                        <option value="Health & Fitness">Health & Fitness</option>
                        <option value="Career & Business">Career & Business</option>
                        <option value="Travel & Adventure">Travel & Adventure</option>
                        <option value="Wealth & Finance">Wealth & Finance</option>
                        <option value="Relationships">Relationships</option>
                        <option value="Personal Growth">Personal Growth</option>
                      </select>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={handleGenerateGoals}
                        disabled={loading}
                        className="flex flex-col items-center justify-center p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-colors border border-indigo-200 text-center"
                      >
                        <Target size={20} className="mb-1" />
                        <span className="text-xs font-medium">Suggest Goals</span>
                      </button>
                      <button 
                        onClick={handleGenerateQuote}
                        disabled={loading}
                        className="flex flex-col items-center justify-center p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors border border-rose-200 text-center"
                      >
                        <Sparkles size={20} className="mb-1" />
                        <span className="text-xs font-medium">Affirmation</span>
                      </button>
                   </div>

                   <div className="pt-2 border-t border-slate-100">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Visualize</label>
                     <div className="flex gap-2">
                        <input 
                           className="flex-1 p-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none"
                           placeholder="Describe your dream..."
                           value={inputText}
                           onChange={e => setInputText(e.target.value)}
                        />
                        <button 
                          onClick={handleGenerateImage}
                          disabled={loading || !inputText}
                          className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 flex items-center justify-center"
                        >
                           <Sparkles size={18} />
                        </button>
                     </div>
                   </div>
                </div>
              )}
            </div>

            {loading && (
               <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-2xl z-50">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-semibold text-indigo-800">Dreaming...</span>
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div 
          className="flex-1 bg-[#e0e5ec] relative cursor-grab active:cursor-grabbing overflow-hidden"
          onMouseDown={handlePanDown}
          onMouseMove={handlePanMove}
          onMouseUp={handlePanUp}
          onMouseLeave={handlePanUp}
        >
          {/* Infinite-like Background Pattern */}
          <div 
            ref={boardRef}
            className="absolute origin-top-left transition-transform duration-75 ease-out shadow-2xl"
            style={{ 
              width: BOARD_WIDTH, 
              height: BOARD_HEIGHT,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              backgroundImage: bgImage ? `url(${bgImage})` : 'radial-gradient(circle, #b8c6db 1px, transparent 1px)',
              backgroundSize: bgImage ? 'cover' : '40px 40px',
              backgroundPosition: 'center',
              backgroundColor: '#f8fafc'
            }}
          >
            {/* Overlay for better readability if bg image is set */}
            {bgImage && <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px] pointer-events-none" />}

            {/* Board Items */}
            {items.map(item => (
              <DraggableItem
                key={item.id}
                item={item}
                scale={scale}
                onUpdate={updateItem}
                onDelete={deleteItem}
                onBringToFront={bringToFront}
              />
            ))}
            
            {/* Empty State Hint if needed */}
            {items.length === 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-slate-400 pointer-events-none z-10">
                <h2 className="text-4xl font-serif font-bold text-slate-300 mb-2 drop-shadow-md">2026</h2>
                <p className="drop-shadow-sm text-slate-500 font-medium">Start building your vision</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}