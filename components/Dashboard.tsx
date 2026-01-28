import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { FoodEntry, UserGoals, MealType } from '../types';
import { Plus, Flame, Activity, Droplets, Info, ArrowRight } from 'lucide-react';

interface DashboardProps {
  entries: FoodEntry[];
  goals: UserGoals;
  onNavigate: (view: any) => void;
  onDelete: (id: string) => void;
  onGeneratePlan: () => void;
}

const MacroPill = ({ label, current, max, color }: { label: string, current: number, max: number, color: string }) => {
  const percent = Math.min(100, Math.max(0, (current / max) * 100));
  
  return (
    <div className="flex flex-col gap-1 flex-1">
      <div className="flex justify-between text-xs text-slate-400 font-medium">
        <span>{label}</span>
        <span>{Math.round(current)}/{max}g</span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${color}`} 
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

const MealCard = ({ 
  title, 
  icon: Icon, 
  entries,
  onAdd,
  onDelete
}: { 
  title: string, 
  icon: any, 
  entries: FoodEntry[],
  onAdd: () => void,
  onDelete: (id: string) => void
}) => {
  const totalCals = entries.reduce((acc, e) => acc + e.calories, 0);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm transition hover:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-full text-accent-500">
            <Icon size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">{title}</h3>
            <p className="text-xs text-slate-400">{totalCals > 0 ? `${totalCals} kcal` : 'No food logged'}</p>
          </div>
        </div>
        <button onClick={onAdd} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
          <Plus size={20} />
        </button>
      </div>

      {entries.length > 0 && (
        <div className="space-y-2 mt-2">
          {entries.map(entry => (
            <div key={entry.id} className="flex justify-between items-center text-sm p-2 bg-slate-800/50 rounded-lg group">
              <div className="flex flex-col">
                <span className="text-slate-200 font-medium">{entry.name}</span>
                <span className="text-xs text-slate-500">
                   {entry.protein}p • {entry.carbs}c • {entry.fat}f
                   {entry.inflammationFlags.length > 0 && (
                     <span className="ml-2 text-red-400 flex items-center inline-flex gap-1">
                       <Info size={10} /> Inflammatory
                     </span>
                   )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-300 font-bold">{entry.calories}</span>
                <button 
                  onClick={() => onDelete(entry.id)}
                  className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ entries, goals, onNavigate, onDelete, onGeneratePlan }) => {
  const totalCals = entries.reduce((acc, e) => acc + e.calories, 0);
  const totalProtein = entries.reduce((acc, e) => acc + e.protein, 0);
  const totalCarbs = entries.reduce((acc, e) => acc + e.carbs, 0);
  const totalFat = entries.reduce((acc, e) => acc + e.fat, 0);
  
  const remainingCals = goals.calories - totalCals;
  
  // Gauge Data
  const gaugeData = [
    { name: 'Consumed', value: totalCals, color: '#84cc16' }, // accent-500
    { name: 'Remaining', value: Math.max(0, remainingCals), color: '#1e293b' }, // slate-800
  ];
  if (remainingCals < 0) {
    gaugeData[0].color = '#ef4444'; 
    gaugeData[1].value = 0;
  }

  const groupEntries = (type: MealType) => entries.filter(e => e.mealType === type);

  return (
    <div className="pb-24 md:pb-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Desktop): Gauge & Targets */}
        <div className="md:col-span-5 lg:col-span-4 space-y-6 md:sticky md:top-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                Today Calories <Flame size={18} className="text-orange-500" />
              </h2>
              <span className="text-sm text-slate-400">{goals.calories} kcal Goal</span>
            </div>

            <div className="h-48 relative -mx-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gaugeData}
                      cx="50%"
                      cy="70%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                    >
                      {gaugeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute top-[55%] left-1/2 -translate-x-1/2 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Remaining</span>
                  <span className={`text-4xl font-bold tracking-tighter ${remainingCals < 0 ? 'text-red-500' : 'text-slate-100'}`}>
                    {remainingCals.toLocaleString()}
                  </span>
                  <span className="text-sm text-slate-500 ml-1">kcal</span>
                </div>
            </div>

            {/* Macro Pills */}
            <div className="flex gap-4 mt-2">
              <MacroPill label="Protein" current={totalProtein} max={goals.protein} color="bg-blue-500" />
              <MacroPill label="Carbs" current={totalCarbs} max={goals.carbs} color="bg-orange-500" />
              <MacroPill label="Fat" current={totalFat} max={goals.fat} color="bg-purple-500" />
            </div>
          </div>

          {/* Generator Button (Moved to side on desktop) */}
          <button 
            onClick={onGeneratePlan}
            className="w-full py-4 bg-accent-500 hover:bg-accent-500/90 hover:scale-[1.02] text-slate-950 font-bold rounded-2xl shadow-lg shadow-accent-500/20 transition flex items-center justify-center gap-2"
          >
            <Activity size={20} />
            Auto-Complete Day
            <ArrowRight size={16} className="opacity-60" />
          </button>
        </div>

        {/* Right Column (Desktop): Meals Grid */}
        <div className="md:col-span-7 lg:col-span-8">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold text-slate-100">Today's Meals</h3>
             <button onClick={() => onNavigate('logger')} className="text-sm text-accent-500 font-medium hover:underline md:hidden">
               + Log Food
             </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             <MealCard title="Breakfast" icon={Flame} entries={groupEntries('Breakfast')} onAdd={() => onNavigate('logger')} onDelete={onDelete} />
             <MealCard title="Lunch" icon={Flame} entries={groupEntries('Lunch')} onAdd={() => onNavigate('logger')} onDelete={onDelete} />
             <MealCard title="Dinner" icon={Flame} entries={groupEntries('Dinner')} onAdd={() => onNavigate('logger')} onDelete={onDelete} />
             <MealCard title="Snacks" icon={Droplets} entries={groupEntries('Snack')} onAdd={() => onNavigate('logger')} onDelete={onDelete} />
          </div>
        </div>

      </div>
    </div>
  );
};