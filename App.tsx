import React, { useState, useEffect, useMemo } from 'react';
import { Home, User, Utensils, Box, Brain, ChefHat, Dumbbell, Activity, Calendar, LayoutDashboard, Loader2, Save } from 'lucide-react';
import { FoodEntry, UserGoals, InventoryItem, AppView, DayLog } from './types';
import { Dashboard } from './components/Dashboard';
import { Logger } from './components/Logger';
import { WeeklyStats } from './components/WeeklyStats';
import { getCoachAdvice, generateMealCompletion } from './services/geminiService';

// -- Mock Initial Data --
const INITIAL_GOALS: UserGoals = {
  type: 'Recomposition',
  calories: 2200,
  protein: 180,
  carbs: 200,
  fat: 70,
  isTrainingDay: false,
  steps: 8000,
  water: 3000,
  fiber: 30,
  salt: 2300,
  potassium: 3500
};

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Chicken Breast', quantity: '500g' },
  { id: '2', name: 'Rice', quantity: '1kg' },
  { id: '3', name: 'Broccoli', quantity: '2 heads' },
  { id: '4', name: 'Eggs', quantity: '6' },
];

function App() {
  const [view, setView] = useState<AppView>('dashboard');
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [goals, setGoals] = useState<UserGoals>(INITIAL_GOALS);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [waterIntake, setWaterIntake] = useState(0); // ml
  
  // Edit State
  const [editingEntry, setEditingEntry] = useState<FoodEntry | undefined>(undefined);
  const [showLogger, setShowLogger] = useState(false);

  // AI State
  const [coachMessage, setCoachMessage] = useState<string | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<any>(null);
  const [chefCraving, setChefCraving] = useState('');
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [loadingChef, setLoadingChef] = useState(false);

  // -- Derived State --
  const adjustedGoals = useMemo(() => {
    let g = { ...goals };
    if (g.isTrainingDay) {
      g.calories += 300;
      g.carbs += 50;
    }
    // Step adjustments
    if (g.steps > 10000) {
      g.carbs += 30; // Earned carbs
    }
    return g;
  }, [goals]);

  // -- History Generator (Current Week Mon-Sun) --
  const weeklyHistory = useMemo(() => {
    const history: DayLog[] = [];
    const today = new Date();
    // Get current date's day of week (0 = Sun, 1 = Mon, ... 6 = Sat)
    const currentDay = today.getDay(); 
    // Calculate distance to Monday (if Sun(0) -> 6, if Mon(1) -> 0)
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);
    monday.setHours(0,0,0,0);

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const isFuture = d > today;
        const isToday = dateStr === today.toISOString().split('T')[0];

        if (isFuture) {
             history.push({
                date: dateStr,
                dayName: dayNames[i],
                entries: []
            });
        } else if (isToday) {
             history.push({
                date: dateStr,
                dayName: dayNames[i],
                entries: entries
            });
        } else {
             // Past days mock data
            const variance = () => (Math.random() * 0.4) - 0.2; // +/- 20%
            const dailyCals = Math.round(goals.calories * (1 + variance()));
            
            // Distribute calories roughly to macros
            const p = Math.round((dailyCals * 0.3) / 4);
            const c = Math.round((dailyCals * 0.4) / 4);
            const f = Math.round((dailyCals * 0.3) / 9);

            history.push({
                date: dateStr,
                dayName: dayNames[i],
                entries: [{ 
                    id: `mock-${i}`, 
                    name: 'Mock Entry', 
                    mealType: 'Snack', 
                    timestamp: d.getTime(), 
                    tags: [], 
                    inflammationFlags: [], 
                    calories: dailyCals, 
                    protein: p, 
                    carbs: c, 
                    fat: f, fiber: 20, salt: 2000, potassium: 3000 
                }]
            });
        }
    }
    return history;
  }, [entries, goals]);

  // -- Handlers --
  const handleSaveEntry = (entry: FoodEntry) => {
    setEntries(prev => {
        const exists = prev.some(e => e.id === entry.id);
        if (exists) {
            return prev.map(e => e.id === entry.id ? entry : e);
        } else {
            return [...prev, entry];
        }
    });
    setEditingEntry(undefined);
    setShowLogger(false);
    setView('dashboard');
  };

  const handleEditEntry = (entry: FoodEntry) => {
      setEditingEntry(entry);
      setShowLogger(true);
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleOpenLogger = () => {
      setEditingEntry(undefined);
      setShowLogger(true);
  };

  const handleConsultCoach = async () => {
    setLoadingCoach(true);
    const msg = await getCoachAdvice(entries, adjustedGoals);
    setCoachMessage(msg);
    setLoadingCoach(false);
  };

  const handleAutoGeneratePlan = async () => {
    setView('coach');
    setLoadingChef(true);
    try {
        const recipe = await generateMealCompletion(entries, adjustedGoals, inventory, chefCraving);
        setGeneratedRecipe(recipe);
    } catch (e) {
        console.error(e);
    }
    setLoadingChef(false);
  };

  // Helper for Profile Inputs
  const handleGoalChange = (field: keyof UserGoals, value: string | number) => {
      setGoals(prev => ({
          ...prev,
          [field]: typeof prev[field] === 'number' ? Number(value) : value
      }));
  };

  // -- Components --
  
  const NavItem = ({ id, icon: Icon, label, mobileOnly = false }: { id: AppView, icon: any, label: string, mobileOnly?: boolean }) => (
     <button 
       onClick={() => setView(id)} 
       className={`
         flex items-center gap-3 p-3 rounded-xl transition-all duration-200
         ${mobileOnly ? 'md:hidden' : ''}
         ${view === id ? 'text-accent-500 bg-slate-800 md:bg-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}
       `}
     >
       <Icon size={24} />
       <span className="hidden md:block font-medium">{label}</span>
     </button>
  );

  const SideBar = () => (
    <div className="hidden md:flex flex-col w-64 bg-slate-950 border-r border-slate-900 h-screen sticky top-0 p-6">
       <div className="flex items-center gap-3 mb-10 text-white">
          <div className="w-10 h-10 bg-accent-500 rounded-xl flex items-center justify-center text-slate-950 shadow-lg shadow-accent-500/20">
             <Brain size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">NutriMind</span>
       </div>

       <div className="flex flex-col gap-2">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="weekly" icon={Calendar} label="Weekly View" />
          <NavItem id="coach" icon={Brain} label="AI Coach" />
          <NavItem id="inventory" icon={Box} label="Inventory" />
          <NavItem id="profile" icon={User} label="My Targets" />
       </div>

       <div className="mt-auto">
          <button 
             onClick={handleOpenLogger}
             className="w-full py-3 bg-accent-500 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-accent-400 transition"
          >
             <Utensils size={18} /> Log Food
          </button>
       </div>
    </div>
  );

  const BottomNav = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 p-2 z-40 pb-safe">
      <div className="flex justify-around items-center max-w-md mx-auto relative">
        <button onClick={() => setView('dashboard')} className={`p-3 rounded-full transition ${view === 'dashboard' ? 'text-accent-500 bg-slate-800' : 'text-slate-500'}`}>
          <Home size={24} />
        </button>
        <button onClick={() => setView('weekly')} className={`p-3 rounded-full transition ${view === 'weekly' ? 'text-accent-500 bg-slate-800' : 'text-slate-500'}`}>
          <Calendar size={24} />
        </button>
        
        {/* FAB for Logger */}
        <div className="relative -top-6">
           <button 
             onClick={handleOpenLogger}
             className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-900 shadow-lg shadow-white/10 hover:scale-105 transition-transform"
           >
             <div className="w-12 h-12 bg-slate-950 rounded-full flex items-center justify-center text-white">
                <Utensils size={20} />
             </div>
           </button>
        </div>

        <button onClick={() => setView('coach')} className={`p-3 rounded-full transition ${view === 'coach' ? 'text-accent-500 bg-slate-800' : 'text-slate-500'}`}>
          <Brain size={24} />
        </button>
        <button onClick={() => setView('profile')} className={`p-3 rounded-full transition ${view === 'profile' ? 'text-accent-500 bg-slate-800' : 'text-slate-500'}`}>
          <User size={24} />
        </button>
      </div>
    </div>
  );

  // -- Views --
  const renderView = () => {
    switch(view) {
      case 'dashboard':
        return (
            <Dashboard 
                entries={entries} 
                goals={adjustedGoals} 
                waterIntake={waterIntake}
                onAddWater={(amount) => setWaterIntake(prev => prev + amount)}
                onNavigate={(v) => { if(v==='logger') handleOpenLogger(); else setView(v); }} 
                onDelete={handleDeleteEntry}
                onEdit={handleEditEntry} 
                onGeneratePlan={handleAutoGeneratePlan} 
            />
        );
      case 'weekly':
        return <WeeklyStats history={weeklyHistory} goals={adjustedGoals} />;
      case 'logger':
        // Not used as view anymore, strictly modal overlay
        return null; 
      case 'coach':
        return (
            <div className="space-y-6 pt-4 max-w-4xl">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Brain className="text-purple-400"/> AI Brain
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Coach Section */}
                  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm h-full flex flex-col">
                      <h3 className="font-semibold text-lg text-white mb-2">The Coach</h3>
                      <p className="text-slate-400 text-sm mb-4">Analyzes your daily salt, micros, and macros.</p>
                      
                      {!coachMessage ? (
                          <div className="mt-auto">
                            <button 
                                onClick={handleConsultCoach}
                                disabled={loadingCoach}
                                className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                            >
                                {loadingCoach ? <><Loader2 className="animate-spin" size={20}/> Thinking...</> : 'Analyze My Day'}
                            </button>
                          </div>
                      ) : (
                          <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-xl flex-1">
                              <p className="text-purple-200 italic">"{coachMessage}"</p>
                              <button onClick={() => setCoachMessage(null)} className="text-xs text-purple-400 mt-4 hover:underline">Reset</button>
                          </div>
                      )}
                  </div>

                  {/* Chef Section */}
                  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm h-full flex flex-col">
                      <h3 className="font-semibold text-lg text-white mb-2 flex items-center gap-2"><ChefHat size={20}/> The Chef</h3>
                      <p className="text-slate-400 text-sm mb-4">Creates recipes from your inventory to hit remaining macros.</p>
                      
                      {!generatedRecipe ? (
                          <div className="mt-auto space-y-3">
                            <input 
                              type="text"
                              value={chefCraving}
                              onChange={(e) => setChefCraving(e.target.value)}
                              placeholder="Any cravings? (e.g., Spicy, Pasta, Sweet)"
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition"
                            />
                            <button 
                                onClick={handleAutoGeneratePlan}
                                disabled={loadingChef}
                                className="w-full py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition shadow-lg shadow-orange-600/20"
                            >
                                {loadingChef ? <><Loader2 className="animate-spin" size={20}/> Cooking...</> : 'Complete My Day'}
                            </button>
                          </div>
                      ) : (
                          <div className="space-y-3 flex-1">
                              <div className="bg-orange-900/20 border border-orange-500/30 p-4 rounded-xl h-full overflow-y-auto">
                                  <h4 className="font-bold text-orange-200 text-lg mb-2">{generatedRecipe.title}</h4>
                                  <p className="text-xs text-orange-200/60 mb-3">{generatedRecipe.description}</p>
                                  <div className="flex gap-4 text-xs text-slate-400 mb-4 bg-slate-900/50 p-2 rounded-lg">
                                      <span>{generatedRecipe.macros?.calories} kcal</span>
                                      <span>{generatedRecipe.macros?.protein}g Protein</span>
                                      <span>{generatedRecipe.macros?.carbs}g Carbs</span>
                                  </div>
                                  <div className="text-sm text-slate-300 mb-4">
                                      <strong>Ingredients:</strong>
                                      <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-400">
                                          {generatedRecipe.ingredients?.map((i: string, idx: number) => <li key={idx}>{i}</li>)}
                                      </ul>
                                  </div>
                                  <div className="text-sm text-slate-300">
                                      <strong>Instructions:</strong>
                                      <ol className="list-decimal pl-4 mt-1 space-y-1 text-slate-400">
                                          {generatedRecipe.instructions?.map((i: string, idx: number) => <li key={idx}>{i}</li>)}
                                      </ol>
                                  </div>
                              </div>
                              <button onClick={() => setGeneratedRecipe(null)} className="w-full py-2 bg-slate-800 rounded-lg text-slate-400 text-sm hover:text-white">Clear Recipe</button>
                          </div>
                      )}
                  </div>
                </div>
            </div>
        );
      case 'inventory':
          return (
              <div className="space-y-6 pt-4 max-w-4xl">
                  <h2 className="text-2xl font-bold text-white">Kitchen Inventory</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {inventory.map(item => (
                          <div key={item.id} className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center group hover:border-slate-700 transition">
                              <span className="text-slate-200 font-medium">{item.name}</span>
                              <span className="text-slate-500 text-sm bg-slate-800 px-2 py-1 rounded group-hover:bg-slate-950 transition">{item.quantity}</span>
                          </div>
                      ))}
                      <div className="p-4 rounded-xl border border-dashed border-slate-700 flex justify-center text-slate-500 items-center gap-2 cursor-pointer hover:bg-slate-900/50 hover:text-slate-300 transition">
                          <PlusIcon /> Add Item
                      </div>
                  </div>
              </div>
          );
      case 'profile':
          return (
              <div className="space-y-6 pt-4 max-w-4xl">
                  <h2 className="text-2xl font-bold text-white">Smart Targets</h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      {/* Goal Type Switcher */}
                      <div className="flex bg-slate-900 p-1 rounded-xl">
                          {(['Cut', 'Recomposition', 'Bulk'] as const).map(t => (
                              <button 
                                key={t}
                                onClick={() => handleGoalChange('type', t)}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${goals.type === t ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                              >
                                  {t}
                              </button>
                          ))}
                      </div>

                      {/* Context Toggles */}
                      <div className="space-y-3">
                          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
                              <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-full ${goals.isTrainingDay ? 'bg-orange-500/20 text-orange-500' : 'bg-slate-800 text-slate-500'}`}>
                                      <Dumbbell size={20} />
                                  </div>
                                  <div>
                                      <p className="font-medium text-slate-200">Training Session</p>
                                      <p className="text-xs text-slate-500">Increases Calorie & Carb Target</p>
                                  </div>
                              </div>
                              <button 
                                onClick={() => setGoals({...goals, isTrainingDay: !goals.isTrainingDay})}
                                className={`w-12 h-6 rounded-full transition relative ${goals.isTrainingDay ? 'bg-accent-500' : 'bg-slate-700'}`}
                              >
                                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${goals.isTrainingDay ? 'left-7' : 'left-1'}`} />
                              </button>
                          </div>
                      </div>
                    </div>

                    {/* Editable Summary */}
                    <div className="p-6 bg-slate-900/80 rounded-2xl border border-slate-800 h-fit space-y-4">
                        <div className="flex items-center justify-between mb-2">
                             <h3 className="text-slate-300 text-sm uppercase font-bold tracking-wider">Base Targets</h3>
                             <Save size={16} className="text-slate-500" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <InputCard label="Calories" val={goals.calories} unit="kcal" onChange={(v) => handleGoalChange('calories', v)} />
                            <InputCard label="Steps" val={goals.steps} unit="steps" onChange={(v) => handleGoalChange('steps', v)} />
                            <InputCard label="Protein" val={goals.protein} unit="g" onChange={(v) => handleGoalChange('protein', v)} />
                            <InputCard label="Carbs" val={goals.carbs} unit="g" onChange={(v) => handleGoalChange('carbs', v)} />
                            <InputCard label="Fat" val={goals.fat} unit="g" onChange={(v) => handleGoalChange('fat', v)} />
                            <InputCard label="Water" val={goals.water} unit="ml" onChange={(v) => handleGoalChange('water', v)} />
                        </div>

                        <div className="pt-4 border-t border-slate-800 mt-4">
                             <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Micronutrients</h3>
                             <div className="grid grid-cols-3 gap-3">
                                <InputCard label="Fiber" val={goals.fiber} unit="g" onChange={(v) => handleGoalChange('fiber', v)} />
                                <InputCard label="Salt" val={goals.salt} unit="mg" onChange={(v) => handleGoalChange('salt', v)} />
                                <InputCard label="Potassium" val={goals.potassium} unit="mg" onChange={(v) => handleGoalChange('potassium', v)} />
                             </div>
                        </div>
                    </div>
                  </div>
              </div>
          );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-accent-500/30 overflow-hidden">
        <SideBar />
        
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
           {/* Header / Date Selector - Persistent */}
            <div className="pt-safe px-4 md:px-8 py-6 w-full sticky top-0 bg-slate-950/95 backdrop-blur-md z-30 border-b border-slate-900/50">
                <div className="max-w-6xl mx-auto w-full">
                  <div className="flex justify-between items-center mb-4">
                      <h1 className="text-2xl font-bold tracking-tight text-white md:hidden">Today</h1>
                      <h1 className="text-3xl font-bold tracking-tight text-white hidden md:block">
                        {view === 'dashboard' ? 'Overview' : view === 'weekly' ? 'Weekly Review' : view.charAt(0).toUpperCase() + view.slice(1)}
                      </h1>
                      
                      {/* Desktop Date Selector */}
                      <div className="hidden md:flex items-center gap-4 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
                          {['-2', '-1', '0', '+1', '+2'].map((offset, i) => {
                             const isToday = offset === '0';
                             const date = new Date();
                             date.setDate(date.getDate() + parseInt(offset));
                             const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
                             return (
                                 <button key={i} className={`px-4 py-2 rounded-xl transition ${isToday ? 'bg-accent-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
                                    <span className="text-xs opacity-60 mr-2">{dayName}</span>
                                    <span>{date.getDate()}</span>
                                 </button>
                             )
                          })}
                      </div>

                      <button className="text-sm font-medium text-slate-400 hover:text-white transition md:hidden">Progress</button>
                  </div>
                  
                  {/* Mobile Horizontal Date Scroll */}
                  <div className="md:hidden flex justify-between items-center bg-transparent overflow-x-auto no-scrollbar pb-2">
                      {['-3', '-2', '-1', '0', '+1', '+2', '+3'].map((offset, i) => {
                          const isToday = offset === '0';
                          const date = new Date();
                          date.setDate(date.getDate() + parseInt(offset));
                          const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
                          
                          return (
                              <div key={i} className="flex flex-col items-center gap-1 min-w-[3rem] cursor-pointer group">
                                  <span className="text-xs text-slate-500 group-hover:text-slate-300">{dayName}</span>
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition ${isToday ? 'bg-accent-500 text-slate-950 shadow-lg shadow-accent-500/20' : 'bg-slate-900 text-slate-400 group-hover:bg-slate-800'}`}>
                                      {date.getDate()}
                                  </div>
                              </div>
                          )
                      })}
                  </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-24 md:pb-8 w-full max-w-6xl mx-auto">
                {renderView()}
            </main>
        </div>

        <BottomNav />
        
        {/* Modal Logger */}
        {showLogger && (
            <Logger 
                initialEntry={editingEntry}
                onSave={handleSaveEntry} 
                onCancel={() => { setShowLogger(false); setEditingEntry(undefined); }} 
            />
        )}
    </div>
  );
}

// Small Helper Components
const InputCard = ({label, val, unit, onChange}: {label: string, val: number, unit: string, onChange: (v: string) => void}) => (
    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 focus-within:ring-1 focus-within:ring-primary-500 transition">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <div className="flex items-baseline gap-1">
             <input 
                type="number" 
                value={val} 
                onChange={(e) => onChange(e.target.value)}
                className="bg-transparent text-xl font-bold text-slate-200 w-full focus:outline-none"
             />
             <span className="text-xs font-normal text-slate-500">{unit}</span>
        </div>
    </div>
);

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);

export default App;