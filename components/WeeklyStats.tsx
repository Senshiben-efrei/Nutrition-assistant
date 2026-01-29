import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { DayLog, UserGoals } from '../types';
import { TrendingUp, TrendingDown, Calendar, Target } from 'lucide-react';

interface WeeklyStatsProps {
  history: DayLog[];
  goals: UserGoals;
}

const COLORS = {
    carbs: '#2dd4bf', // teal-400
    protein: '#facc15', // yellow-400
    fat: '#c084fc', // purple-400
    empty: '#1e293b', // slate-800
};

const DayCard = ({ log, goals }: { log: DayLog, goals: UserGoals }) => {
  const totalCals = log.entries.reduce((acc, e) => acc + e.calories, 0);
  const totalPro = log.entries.reduce((acc, e) => acc + e.protein, 0);
  const totalCarbs = log.entries.reduce((acc, e) => acc + e.carbs, 0);
  const totalFat = log.entries.reduce((acc, e) => acc + e.fat, 0);

  // Approximate calories from macros for visualization
  const calsFromPro = totalPro * 4;
  const calsFromCarbs = totalCarbs * 4;
  const calsFromFat = totalFat * 9;
  
  const remaining = Math.max(0, goals.calories - (calsFromPro + calsFromCarbs + calsFromFat));
  
  // Data for the segmented ring
  const data = [
      { name: 'Carbs', value: calsFromCarbs, color: COLORS.carbs },
      { name: 'Protein', value: calsFromPro, color: COLORS.protein },
      { name: 'Fat', value: calsFromFat, color: COLORS.fat },
      { name: 'Remaining', value: remaining, color: COLORS.empty }
  ];

  // If entry is empty (future day), show empty ring
  const isEmptyDay = log.entries.length === 0;
  const emptyData = [{ name: 'Empty', value: 100, color: COLORS.empty }];

  // Determine date display
  const isToday = new Date().toISOString().split('T')[0] === log.date;
  const percent = Math.min(100, Math.round((totalCals / goals.calories) * 100));

  return (
    <div className={`p-4 rounded-3xl border flex flex-col items-center justify-between relative overflow-hidden transition h-full ${isToday ? 'bg-slate-900 border-accent-500/50 shadow-lg shadow-accent-500/10' : 'bg-slate-900/50 border-slate-800 opacity-90'}`}>
       
       <div className="text-center mb-3 w-full border-b border-slate-800 pb-2">
         <h4 className={`text-sm font-bold uppercase tracking-wider ${isToday ? 'text-accent-500' : 'text-slate-400'}`}>{log.dayName}</h4>
         <span className="text-[10px] text-slate-500">{log.date.slice(5).replace('-','/')}</span>
       </div>

       <div className="w-28 h-28 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
               <Pie
                  data={isEmptyDay ? emptyData : data}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={46}
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={isEmptyDay ? 0 : 2}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
               >
                  {(isEmptyDay ? emptyData : data).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
               </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Info */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             {isEmptyDay ? (
                 <span className="text-xs text-slate-600 font-medium">--</span>
             ) : (
                <>
                    <span className="text-xl font-bold text-white leading-none">{percent}%</span>
                    <span className="text-[9px] text-slate-500 font-medium mt-1">{totalCals} kcal</span>
                </>
             )}
          </div>
       </div>

       {/* Legend / Stats */}
       <div className="mt-4 w-full space-y-1.5">
          {!isEmptyDay ? (
            <>
                <div className="flex justify-between items-center text-[10px]">
                    <span className="text-teal-400 font-medium flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-teal-400"/>Carbs</span>
                    <span className="text-slate-400">{totalCarbs}g</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                    <span className="text-yellow-400 font-medium flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400"/>Prot</span>
                    <span className="text-slate-400">{totalPro}g</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                    <span className="text-purple-400 font-medium flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-purple-400"/>Fats</span>
                    <span className="text-slate-400">{totalFat}g</span>
                </div>
            </>
          ) : (
              <div className="h-14 flex items-center justify-center text-[10px] text-slate-600 italic">
                  No Data
              </div>
          )}
       </div>
    </div>
  );
};

export const WeeklyStats: React.FC<WeeklyStatsProps> = ({ history, goals }) => {
  // Calculate Summaries
  const activeDays = history.filter(d => d.entries.length > 0);
  const totalWeeklyCals = activeDays.reduce((acc, day) => acc + day.entries.reduce((eAcc, e) => eAcc + e.calories, 0), 0);
  
  // Target is roughly goals * days passed (including today)
  const daysPassed = activeDays.length || 1;
  const targetWeeklyCals = goals.calories * daysPassed;
  
  const avgCals = Math.round(totalWeeklyCals / daysPassed) || 0;
  const diff = targetWeeklyCals - totalWeeklyCals;
  const isDeficit = diff > 0;

  return (
    <div className="space-y-8 pt-4">
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm shadow-xl">
              <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Calendar size={18} className="text-accent-500"/> Weekly Overview</h2>
                    <p className="text-slate-400 text-sm">Mon - Sun Performance</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isDeficit ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {isDeficit ? 'Deficit' : 'Surplus'}
                  </div>
              </div>

              <div className="flex items-center gap-8">
                  <div>
                      <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Weekly Avg</span>
                      <div className="text-3xl font-bold text-white mt-1">{avgCals} <span className="text-sm text-slate-500 font-normal">kcal</span></div>
                  </div>
                  <div className="h-8 w-px bg-slate-800"></div>
                  <div>
                      <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Net Status</span>
                      <div className={`text-3xl font-bold mt-1 flex items-center gap-2 ${isDeficit ? 'text-green-400' : 'text-red-400'}`}>
                         {isDeficit ? <TrendingDown size={24}/> : <TrendingUp size={24}/>}
                         {Math.abs(diff).toLocaleString()} <span className="text-sm text-slate-500 font-normal">kcal</span>
                      </div>
                  </div>
              </div>
          </div>
          
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex flex-col justify-center gap-3 min-w-[200px]">
             <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Color Key</span>
             <div className="flex items-center gap-2 text-xs text-slate-300">
                <div className="w-3 h-3 rounded-full bg-teal-400"></div> Carbs
             </div>
             <div className="flex items-center gap-2 text-xs text-slate-300">
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div> Protein
             </div>
             <div className="flex items-center gap-2 text-xs text-slate-300">
                <div className="w-3 h-3 rounded-full bg-purple-400"></div> Fats
             </div>
          </div>
      </div>

      {/* Grid */}
      <div>
         <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Target size={18} className="text-blue-500"/> Daily Breakdown</h3>
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {history.map((log, idx) => (
                <DayCard key={idx} log={log} goals={goals} />
            ))}
         </div>
      </div>
    </div>
  );
};