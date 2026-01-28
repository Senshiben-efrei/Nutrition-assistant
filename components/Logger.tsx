import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Loader2, Sparkles, X, Plus } from 'lucide-react';
import { analyzeMultimodal } from '../services/geminiService';
import { FoodEntry, MealType } from '../types';

interface LoggerProps {
  onAddEntry: (entry: FoodEntry) => void;
  onCancel: () => void;
}

interface ImageFile {
  id: string;
  data: string; // Base64
  mimeType: string;
}

export const Logger: React.FC<LoggerProps> = ({ onAddEntry, onCancel }) => {
  const [inputText, setInputText] = useState('');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const contextOptions = ["Pre-Workout", "Post-Workout", "Cheat Meal", "High Steps", "Late Night"];

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

  const handleSubmit = async () => {
    if (!inputText && images.length === 0) return;
    
    setLoading(true);
    try {
      const result = await analyzeMultimodal(inputText, images, tags);

      // Auto-detect meal type fallback
      const timeOfDay = new Date().getHours();
      let autoMealType: MealType = 'Snack';
      if (timeOfDay >= 5 && timeOfDay < 11) autoMealType = 'Breakfast';
      else if (timeOfDay >= 11 && timeOfDay < 15) autoMealType = 'Lunch';
      else if (timeOfDay >= 15 && timeOfDay < 22) autoMealType = 'Dinner';

      const fullEntry: FoodEntry = {
        id: crypto.randomUUID(),
        name: result.name || "Unknown Food",
        calories: result.calories || 0,
        protein: result.protein || 0,
        carbs: result.carbs || 0,
        fat: result.fat || 0,
        fiber: result.fiber || 0,
        salt: result.salt || 0,
        potassium: result.potassium || 0,
        mealType: (result.mealType as MealType) || autoMealType,
        timestamp: Date.now(),
        tags: tags,
        inflammationFlags: result.inflammationFlags || [],
        images: images.map(i => `data:${i.mimeType};base64,${i.data}`)
      };

      onAddEntry(fullEntry);
    } catch (err) {
      console.error(err);
      alert("Failed to analyze food. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onCancel} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white">Log Food</h2>
          <button onClick={onCancel} className="p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700 transition"><X size={24} /></button>
        </div>

        <div className="flex-1 flex flex-col gap-6 p-6 overflow-y-auto">
          {/* Text Input */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 focus-within:ring-2 focus-within:ring-primary-500 transition-all">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe your meal (e.g., '3 eggs, toast, and a black coffee')..."
              className="w-full h-32 bg-transparent text-white placeholder-slate-500 focus:outline-none resize-none text-lg"
            />
            
            {/* Image Thumbnails & Add Button */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar pt-2">
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
            <label className="text-sm text-slate-400 mb-3 block font-medium uppercase tracking-wider">Context</label>
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
        </div>

        {/* Action Button */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <button
            disabled={loading || (!inputText && images.length === 0)}
            onClick={handleSubmit}
            className="w-full py-4 bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-500 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/20 transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : <><Sparkles size={20} /> Analyze & Log</>}
          </button>
          <p className="text-center text-xs text-slate-500 mt-3">
              Combine text and photos for best accuracy.
          </p>
        </div>
      </div>
    </div>
  );
};