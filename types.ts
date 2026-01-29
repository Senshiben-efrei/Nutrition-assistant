export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  salt: number; // mg
  potassium: number; // mg
}

export interface FoodEntry extends Nutrients {
  id: string;
  name: string;
  mealType: MealType;
  timestamp: number; // ms
  tags: string[]; // e.g., "Pre-Workout", "Cheat Meal"
  inflammationFlags: string[]; // e.g., "High Sugar"
  insight?: string; // AI generated feedback
  images?: string[]; // Array of Base64 data URIs
}

export interface UserGoals {
  type: 'Recomposition' | 'Cut' | 'Bulk';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isTrainingDay: boolean;
  steps: number;
  water: number; // ml
  fiber: number; // g
  salt: number; // mg
  potassium: number; // mg
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: string;
}

export interface DayLog {
  date: string; // ISO date string YYYY-MM-DD
  dayName: string; // Mon, Tue, etc.
  entries: FoodEntry[];
}

export type AppView = 'dashboard' | 'logger' | 'coach' | 'inventory' | 'profile' | 'weekly';