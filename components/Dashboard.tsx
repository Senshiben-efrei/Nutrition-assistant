import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { FoodEntry, UserGoals, MealType } from '../types';
import { Plus, Flame, Activity, Droplets, Info, ArrowRight, Edit2, Zap, Waves } from 'lucide-react';

interface DashboardProps {
  entries: FoodEntry[];
  goals: UserGoals;
  waterIntake: number;
  onAddWater: (amount: number) => void;
  onNavigate: (view: any) => void;
  onDelete: (id: string) => void;
  onEdit: (entry: FoodEntry) => void;
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

const MicroRow = ({ label, current, max, unit, colorClass }: { label: string, current: number, max: number, unit: string, colorClass: string }) => {
   const percent = Math.min(100, (current / max) * 100);
   return (
       <div className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
           <span className="text-xs font-medium text-slate-400 w-20">{label}</span>
           <div className="flex-1 h-1.5 bg-slate-800 rounded-full mx-3 overflow-hidden">
               <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${percent}%` }} />
           </div>
           <span className="text-xs text-slate-300 tabular-nums">{Math.round(current)}<span className="text-slate-600">/{max}{unit}</span></span>
       </div>
   );
};

const MealCard = ({ 
  title, 
  icon: Icon, 
  entries,
  onAdd,
  onDelete,
  onEdit
}: { 
  title: string, 
  icon: any, 
  entries: FoodEntry[],
  onAdd: () => void,
  onDelete: (id: string) => void,
  onEdit: (entry: FoodEntry) => void
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
            <div 
                key={entry.id} 
                onClick={() => onEdit(entry)}
                className="flex justify-between items-center text-sm p-2 bg-slate-800/50 rounded-lg group cursor-pointer hover:bg-slate-800 transition"
            >
              <div className="flex flex-col">
                <span className="text-slate-200 font-medium flex items-center gap-2">
                    {entry.name}
                </span>
                <span className="text-xs text-slate-500">
                   {entry.protein}p • {entry.carbs}c • {entry.fat}f
                   {entry.inflammationFlags.length > 0 && (
                     <span className="ml-2 text-red-400 flex items-center inline-flex gap-1">
                       <Info size={10} /> Inflammatory
                     </span>
                   )}
                </span>
                {entry.insight && (
                  <p className="text-[10px] text-purple-400 mt-1 italic opacity-80">
                     "{entry.insight}"
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-300 font-bold">{entry.calories}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(entry); }}
                        className="p-1 text-slate-500 hover:text-white"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                        className="p-1 text-slate-500 hover:text-red-400"
                    >
                        &times;
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ entries, goals, waterIntake, onAddWater, onNavigate, onDelete, onEdit, onGeneratePlan }) => {
  const totalCals = entries.reduce((acc, e) => acc + e.calories, 0);
  const totalProtein = entries.reduce((acc, e) => acc + e.protein, 0);
  const totalCarbs = entries.reduce((acc, e) => acc + e.carbs, 0);
  const totalFat = entries.reduce((acc, e) => acc + e.fat, 0);
  
  // Micros
  const totalFiber = entries.reduce((acc, e) => acc + (e.fiber || 0), 0);
  const totalSalt = entries.reduce((acc, e) => acc + (e.salt || 0), 0);
  const totalPotassium = entries.reduce((acc, e) => acc + (e.potassium || 0), 0);

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

  // Water Data
  const waterRemaining = Math.max(0, goals.water - waterIntake);
  const waterData = [
      { name: 'Drank', value: waterIntake, color: '#3b82f6' },
      { name: 'Remaining', value: waterRemaining, color: '#1e293b' }
  ];

  const groupEntries = (type: MealType) => entries.filter(e => e.mealType === type);

  return (
    <div className="pb-24 md:pb-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Desktop): Gauges & Trackers */}
        <div className="md:col-span-5 lg:col-span-4 space-y-6 md:sticky md:top-6">
          
          {/* Main Calorie & Macro Card */}
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

          {/* Water & Micros Grid */}
          <div className="grid grid-cols-1 gap-6">
             {/* Water Tracker */}
             <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col items-center">
                 <h3 className="text-sm font-semibold text-slate-300 w-full mb-2 flex items-center gap-2">
                     <Waves size={16} className="text-blue-500" /> Hydration
                 </h3>
                 <div className="w-full h-32 relative">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                            data={waterData}
                            cx="50%"
                            cy="80%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={60}
                            outerRadius={75}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                            >
                            {waterData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            </Pie>
                        </PieChart>
                     </ResponsiveContainer>
                     <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
                         <span className="text-2xl font-bold text-white block">{waterIntake}</span>
                         <span className="text-[10px] text-slate-500 uppercase tracking-widest">ml / {goals.water}</span>
                     </div>
                 </div>
                 <div className="flex gap-2 mt-2 w-full">
                     <button onClick={() => onAddWater(250)} className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-xs font-bold transition">+250ml</button>
                     <button onClick={() => onAddWater(500)} className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-xs font-bold transition">+500ml</button>
                 </div>
             </div>

             {/* Micro Tracker */}
             <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg">
                 <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                     <Zap size={16} className="text-yellow-500" /> Micros
                 </h3>
                 <div className="space-y-1">
                     <MicroRow label="Fiber" current={totalFiber} max={goals.fiber} unit="g" colorClass="bg-green-500" />
                     <MicroRow label="Salt" current={totalSalt} max={goals.salt} unit="mg" colorClass="bg-pink-500" />
                     <MicroRow label="Potassium" current={totalPotassium} max={goals.potassium} unit="mg" colorClass="bg-purple-500" />
                 </div>
             </div>
          </div>

          {/* Generator Button */}
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
             <MealCard title="Breakfast" icon={Flame} entries={groupEntries('Breakfast')} onAdd={() => onNavigate('logger')} onDelete={onDelete} onEdit={onEdit} />
             <MealCard title="Lunch" icon={Flame} entries={groupEntries('Lunch')} onAdd={() => onNavigate('logger')} onDelete={onDelete} onEdit={onEdit} />
             <MealCard title="Dinner" icon={Flame} entries={groupEntries('Dinner')} onAdd={() => onNavigate('logger')} onDelete={onDelete} onEdit={onEdit} />
             <MealCard title="Snacks" icon={Droplets} entries={groupEntries('Snack')} onAdd={() => onNavigate('logger')} onDelete={onDelete} onEdit={onEdit} />
          </div>
        </div>

      </div>
    </div>
  );
};