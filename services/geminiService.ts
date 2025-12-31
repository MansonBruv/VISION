import { GoogleGenAI, Type } from "@google/genai";

// Safe access to API Key for browser environments where process might be undefined
const getApiKey = () => {
  try {
    // @ts-ignore
    return (typeof process !== 'undefined' && process.env?.API_KEY) || '';
  } catch {
    return '';
  }
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

// Helper to validate API key existence
const checkApiKey = () => {
  if (!apiKey) {
    console.error("API Key is missing");
    throw new Error("API Key is missing. If you are on GitHub Pages, AI features will not work without a build step injecting the key.");
  }
};

export const generateAffirmation = async (topic: string): Promise<string> => {
  checkApiKey();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a short, powerful, positive affirmation about "${topic}" for a 2026 vision board. Max 15 words. No quotes.`,
    });
    return response.text?.trim() || "Believe in yourself.";
  } catch (error) {
    console.error("Error generating affirmation:", error);
    return "Focus on the good.";
  }
};

export const generateGoals = async (category: string): Promise<string[]> => {
  checkApiKey();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `List 3 specific, actionable goals for the category "${category}" for the year 2026.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });
    
    // Parse the JSON response manually since response.text is a string
    const text = response.text;
    if (!text) return ["Goal 1", "Goal 2", "Goal 3"];
    
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Error generating goals:", error);
    return ["Dream Big", "Take Action", "Stay Consistent"];
  }
};

export const generateVisionImage = async (prompt: string): Promise<string | null> => {
  checkApiKey();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `A high-quality, aesthetic, artistic vision board style image representing: ${prompt}. Photorealistic, dreamy lighting, 4k.` }
        ]
      },
      config: {
        // Note: responseMimeType is not supported for this model for image gen output usually, 
        // we rely on inlineData in parts.
      }
    });

    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};