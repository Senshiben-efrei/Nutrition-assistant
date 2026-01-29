import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Loader2, Sparkles, X, Plus, Clock, ChevronLeft, Save, Lightbulb } from 'lucide-react';
import { analyzeMultimodal } from '../services/geminiService';
import { FoodEntry, MealType } from '../types';

interface LoggerProps {
  initialEntry?: FoodEntry;
  onSave: (entry: FoodEntry) => void;
  onCancel: () => void;
}

interface ImageFile {
  id: string;
  data: string; // Base64
  mimeType: string;
}

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const formatTime = (timestamp: number) => {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const getTimestampFromTime = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
};

export const Logger: React.FC<LoggerProps> = ({ initialEntry, onSave, onCancel }) => {
  // Mode: if initialEntry exists, we are editing (start at review), else inputting
  const [step, setStep] = useState<'input' | 'review'>(initialEntry ? 'review' : 'input');
  
  // Input State
  const [inputText, setInputText] = useState('');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [tags, setTags] = useState<string[]>(initialEntry?.tags || []);
  const [loading, setLoading] = useState(false);

  // Review/Entry State
  const [entryName, setEntryName] = useState(initialEntry?.name || '');
  const [calories, setCalories] = useState(initialEntry?.calories || 0);
  const [protein, setProtein] = useState(initialEntry?.protein || 0);
  const [carbs, setCarbs] = useState(initialEntry?.carbs || 0);
  const [fat, setFat] = useState(initialEntry?.fat || 0);
  // Micros
  const [fiber, setFiber] = useState(initialEntry?.fiber || 0);
  const [salt, setSalt] = useState(initialEntry?.salt || 0);
  const [potassium, setPotassium] = useState(initialEntry?.potassium || 0);
  
  const [insight, setInsight] = useState(initialEntry?.insight || '');

  const [mealType, setMealType] = useState<MealType>(initialEntry?.mealType || 'Snack');
  const [timeStr, setTimeStr] = useState(initialEntry ? formatTime(initialEntry.timestamp) : formatTime(Date.now()));
  const [inflammationFlags, setInflammationFlags] = useState<string[]>(initialEntry?.inflammationFlags || []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const contextOptions = ["Pre-Workout", "Post-Workout", "Cheat Meal", "High Steps", "Late Night"];

  // Initialize defaults for input mode based on time if not editing
  useEffect(() => {
    if (!initialEntry) {
      const h = new Date().getHours();
      if (h >= 5 && h < 11) setMealType('Breakfast');
      else if (h >= 11 && h < 15) setMealType('Lunch');
      else if (h >= 15 && h < 22) setMealType('Dinner');
      else setMealType('Snack');
    }
  }, [initialEntry]);

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          const mimeType = result.split(';')[0].split(':')[1];
          
          setImages(prev => [...prev, {
            id: crypto.randomUUID(),
            data: base64Data,
            mimeType: mimeType
          }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleAnalyze = async () => {
    if (!inputText && images.length === 0) return;
    
    setLoading(true);
    try {
      const result = await analyzeMultimodal(inputText, images, tags);

      setEntryName(result.name || "Unknown Food");
      setCalories(result.calories || 0);
      setProtein(result.protein || 0);
      setCarbs(result.carbs || 0);
      setFat(result.fat || 0);
      setFiber(result.fiber || 0);
      setSalt(result.salt || 0);
      setPotassium(result.potassium || 0);
      setInsight(result.insight || '');
      
      setInflammationFlags(result.inflammationFlags || []);
      
      if (result.mealType && result.mealType !== 'Snack') {
          setMealType(result.mealType as MealType);
      }

      setStep('review');
    } catch (err) {
      console.error(err);
      alert("Failed to analyze food. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSave = () => {
    const fullEntry: FoodEntry = {
      id: initialEntry?.id || crypto.randomUUID(),
      name: entryName,
      calories,
      protein,
      carbs,
      fat,
      fiber, 
      salt,
      potassium,
      insight,
      mealType,
      timestamp: getTimestampFromTime(timeStr),
      tags,
      inflammationFlags,
      images: initialEntry?.images || images.map(i => `data:${i.mimeType};base64,${i.data}`)
    };
    onSave(fullEntry);
  };

  // --- Render Steps ---

  const renderInputStep = () => (
    <div className="flex flex-col gap-6 h-full">
        {/* Meal & Time Selectors */}
        <div className="flex gap-4">
            <div className="flex-1">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">Meal Type</label>
                <select 
                    value={mealType} 
                    onChange={(e) => setMealType(e.target.value as MealType)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                >
                    {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div className="flex-1">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">Time</label>
                <div className="relative">
                    <input 
                        type="time"
                        value={timeStr}
                        onChange={(e) => setTimeStr(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <Clock className="absolute right-3 top-3.5 text-slate-500 pointer-events-none" size={18} />
                </div>
            </div>
        </div>

        {/* Text Input */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 focus-within:ring-2 focus-within:ring-primary-500 transition-all flex-1 flex flex-col">
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Describe your meal (e.g., '3 eggs, toast, and a black coffee')..."
                className="w-full flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none resize-none text-lg"
            />
            
            {/* Image Thumbnails & Add Button */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar pt-4 border-t border-slate-800 mt-2">
                {images.map(img => (
                <div key={img.id} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-slate-700 group">
                    <img src={`data:${img.mimeType};base64,${img.data}`} alt="Food" className="w-full h-full object-cover" />
                    <button 
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 bg-black/60 p-0.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition"
                    >
                        <X size={14} />
                    </button>
                </div>
                ))}
                
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 hover:text-white hover:border-slate-500 hover:bg-slate-800 transition"
                >
                    <Plus size={24} />
                    <span className="text-[10px] font-medium mt-1">Add Photo</span>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                />
            </div>
        </div>

        {/* Tags */}
        <div>
            <label className="text-xs text-slate-400 mb-3 block font-bold uppercase tracking-wider">Context Tags</label>
            <div className="flex flex-wrap gap-2">
            {contextOptions.map(tag => (
                <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition ${tags.includes(tag) ? 'bg-primary-500/20 border-primary-500 text-primary-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                >
                {tag}
                </button>
            ))}
            </div>
        </div>

        <button
            disabled={loading || (!inputText && images.length === 0)}
            onClick={handleAnalyze}
            className="w-full py-4 bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-500 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/20 transition flex items-center justify-center gap-2 mt-auto"
        >
            {loading ? <Loader2 size={24} className="animate-spin" /> : <><Sparkles size={20} /> Analyze Meal</>}
        </button>
    </div>
  );

  const renderReviewStep = () => (
    <div className="flex flex-col gap-6 h-full">
        
        {/* Insight Card */}
        {insight && (
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 p-4 rounded-2xl flex items-start gap-3 shadow-lg">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-300">
                    <Lightbulb size={18} />
                </div>
                <div>
                    <h4 className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1">AI Insight</h4>
                    <p className="text-sm text-slate-200 leading-relaxed italic">"{insight}"</p>
                </div>
            </div>
        )}

        {/* Header fields */}
        <div className="space-y-4">
             <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">Meal Name</label>
                <input 
                    type="text" 
                    value={entryName}
                    onChange={(e) => setEntryName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
             </div>

             <div className="flex gap-4">
                <div className="flex-1">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">Type</label>
                    <select 
                        value={mealType} 
                        onChange={(e) => setMealType(e.target.value as MealType)}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                    >
                        {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">Time</label>
                    <input 
                        type="time"
                        value={timeStr}
                        onChange={(e) => setTimeStr(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </div>
        </div>

        {/* Macros */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4 block">Macronutrients</label>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">Calories</label>
                    <div className="relative">
                        <input type="number" value={calories} onChange={e => setCalories(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold" />
                        <span className="absolute right-3 top-2 text-xs text-slate-500">kcal</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">Protein</label>
                    <div className="relative">
                        <input type="number" value={protein} onChange={e => setProtein(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold" />
                        <span className="absolute right-3 top-2 text-xs text-slate-500">g</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">Carbs</label>
                    <div className="relative">
                        <input type="number" value={carbs} onChange={e => setCarbs(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold" />
                        <span className="absolute right-3 top-2 text-xs text-slate-500">g</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">Fat</label>
                    <div className="relative">
                        <input type="number" value={fat} onChange={e => setFat(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold" />
                        <span className="absolute right-3 top-2 text-xs text-slate-500">g</span>
                    </div>
                </div>
            </div>

            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4 block pt-4 border-t border-slate-800">Micronutrients</label>
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">Fiber</label>
                    <div className="relative">
                        <input type="number" value={fiber} onChange={e => setFiber(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold" />
                        <span className="absolute right-3 top-2 text-xs text-slate-500">g</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">Salt</label>
                    <div className="relative">
                        <input type="number" value={salt} onChange={e => setSalt(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold" />
                        <span className="absolute right-3 top-2 text-xs text-slate-500">mg</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">Potassium</label>
                    <div className="relative">
                        <input type="number" value={potassium} onChange={e => setPotassium(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold" />
                        <span className="absolute right-3 top-2 text-xs text-slate-500">mg</span>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Buttons */}
        <div className="mt-auto flex gap-3">
             {/* Only show Back button if we came from input mode (not editing existing) */}
             {!initialEntry && (
                 <button 
                    onClick={() => setStep('input')}
                    className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition"
                 >
                    <ChevronLeft size={24} />
                 </button>
             )}
             <button
                onClick={handleFinalSave}
                className="flex-1 py-4 bg-accent-500 hover:bg-accent-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-accent-500/20 transition flex items-center justify-center gap-2"
            >
                <Save size={20} /> {initialEntry ? 'Update Entry' : 'Save Entry'}
            </button>
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onCancel} />
      
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] md:h-auto md:max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">{step === 'input' ? 'Log Food' : (initialEntry ? 'Edit Entry' : 'Review Entry')}</h2>
          <button onClick={onCancel} className="p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700 transition"><X size={20} /></button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
           {step === 'input' ? renderInputStep() : renderReviewStep()}
        </div>
      </div>
    </div>
  );
};