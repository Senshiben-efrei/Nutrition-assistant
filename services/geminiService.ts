import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, UserGoals, FoodEntry } from "../types";

// Helper to remove code fences if the model returns them despite schema
const cleanJson = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeMultimodal = async (
  textInput: string,
  images: { data: string; mimeType: string }[],
  contextTags: string[]
): Promise<Partial<FoodEntry>> => {
  const ai = getAi();
  // gemini-3-flash-preview supports multimodal input (text + images)
  const model = "gemini-3-flash-preview";

  const parts: any[] = [];
  
  // Add images
  images.forEach(img => {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data,
      },
    });
  });

  const timeOfDay = new Date().getHours();
  const prompt = `
    Analyze this food log entry.
    User Description: "${textInput}".
    Context/Tags: "${contextTags.join(', ')}".
    Time of day (hour): ${timeOfDay}.
    
    Estimate the nutritional content for the ENTIRE entry (combining text description and images if present).
    Identify potential inflammation flags (e.g., High Sugar, Processed Oils, Trans Fats).
    Provide a specific "insight": A single, short sentence feedback about this meal (e.g., "Great protein source but check the sodium", "Perfect pre-workout fuel").
    
    Return a JSON object with the following keys:
    name (string, concise summary),
    calories (number),
    protein (number, grams),
    carbs (number, grams),
    fat (number, grams),
    fiber (number, grams),
    salt (number, milligrams),
    potassium (number, milligrams),
    inflammationFlags (array of strings),
    insight (string),
    mealType (string: 'Breakfast', 'Lunch', 'Dinner', 'Snack').
  `;

  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fat: { type: Type.NUMBER },
            fiber: { type: Type.NUMBER },
            salt: { type: Type.NUMBER },
            potassium: { type: Type.NUMBER },
            inflammationFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
            insight: { type: Type.STRING },
            mealType: { type: Type.STRING, enum: ["Breakfast", "Lunch", "Dinner", "Snack"] }
          },
          required: ["name", "calories", "protein", "carbs", "fat", "mealType", "insight"]
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(cleanJson(text));
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze input.");
  }
};

export const getCoachAdvice = async (
  dailyLogs: FoodEntry[],
  goals: UserGoals
): Promise<string> => {
  const ai = getAi();
  const model = "gemini-3-flash-preview";

  const logsSummary = dailyLogs.map(l => `${l.name} (${l.calories}kcal, ${l.salt}mg salt)`).join(", ");
  
  const prompt = `You are "The Coach", a tough but strategic nutrition agent.
  User Goals: ${goals.type} mode. Targets: ${goals.calories} kcal, ${goals.protein}g protein.
  Today's intake so far: ${logsSummary}.
  
  Analyze the salt intake and macro balance. Provide 1-2 sentences of real-time advice.
  If they are doing well, encourage them. If they are eating too much salt or low protein, warn them.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "Keep pushing towards your goals.";
  } catch (error) {
    console.error("Coach Error:", error);
    return "The Coach is currently offline.";
  }
};

export const generateMealCompletion = async (
  dailyLogs: FoodEntry[],
  goals: UserGoals,
  inventory: InventoryItem[],
  craving?: string
): Promise<any> => {
  const ai = getAi();
  const model = "gemini-3-flash-preview"; 

  const totalCals = dailyLogs.reduce((acc, e) => acc + e.calories, 0);
  const totalProtein = dailyLogs.reduce((acc, e) => acc + e.protein, 0);
  const totalCarbs = dailyLogs.reduce((acc, e) => acc + e.carbs, 0);
  const totalFat = dailyLogs.reduce((acc, e) => acc + e.fat, 0);

  const remaining = {
    calories: Math.max(0, goals.calories - totalCals),
    protein: Math.max(0, goals.protein - totalProtein),
    carbs: Math.max(0, goals.carbs - totalCarbs),
    fat: Math.max(0, goals.fat - totalFat),
  };

  // Determine next meal based on time of day and what has been eaten
  const time = new Date().getHours();
  // Simple heuristic: if Dinner is missing and it's evening, suggest Dinner.
  // Ideally we check what MealTypes exist in dailyLogs.
  const hasBreakfast = dailyLogs.some(e => e.mealType === 'Breakfast');
  const hasLunch = dailyLogs.some(e => e.mealType === 'Lunch');
  const hasDinner = dailyLogs.some(e => e.mealType === 'Dinner');

  let nextMeal = 'Snack';
  if (!hasBreakfast && time < 11) nextMeal = 'Breakfast';
  else if (!hasLunch && time < 15) nextMeal = 'Lunch';
  else if (!hasDinner) nextMeal = 'Dinner';

  const inventoryList = inventory.map(i => `${i.quantity} ${i.name}`).join(", ");
  
  const prompt = `
    Context:
    - User Consumed: ${dailyLogs.map(l => l.name).join(', ')}.
    - Remaining Macros Needed: ${remaining.calories} kcal, ${remaining.protein}g P, ${remaining.carbs}g C, ${remaining.fat}g F.
    - Time: ${time}:00.
    - Kitchen Inventory: ${inventoryList}.
    ${craving ? `- User Craving/Request: "${craving}"` : ''}

    Task:
    Generate a COMPLETE meal plan for "${nextMeal}" (or the most appropriate next meal).
    ${craving ? `PRIORITY: Incorporate the user's craving ("${craving}") into the recipe if possible, or provide a healthy alternative.` : ''}
    Attempt to fill the remaining macros exactly using available inventory if possible.
    If remaining macros are low, suggest a light snack.
    
    Return JSON:
    {
      "title": "Name of the meal",
      "description": "Short explanation of why this fits${craving ? ' and satisfies the craving' : ''}",
      "ingredients": ["list of ingredients with amounts"],
      "instructions": ["step 1", "step 2"],
      "macros": { "calories": number, "protein": number, "carbs": number, "fat": number }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    return JSON.parse(cleanJson(response.text || "{}"));
  } catch (error) {
    console.error("Chef Error:", error);
    throw new Error("The Chef could not cook up a recipe.");
  }
};