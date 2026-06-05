import { GoogleGenAI, Type } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface PixelArtData {
  grid: string[][]; // 2D array of hex colors
  palette: string[];
}

export async function generatePixelArt(prompt: string, resolution: number): Promise<PixelArtData> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a ${resolution}x${resolution} pixel art based on this prompt: "${prompt}". 
    Return a JSON object with:
    - "palette": an array of hex color strings used.
    - "grid": a 2D array of indices referring to the palette array.
    
    Keep the style consistent with professional pixel art. 
    For ${resolution}x${resolution}, ensure the grid is exactly ${resolution} rows and ${resolution} columns.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          palette: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Array of hex colors",
          },
          grid: {
            type: Type.ARRAY,
            items: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
            },
            description: "2D array of palette indices",
          },
        },
        required: ["palette", "grid"],
      },
    },
  });

  const data = JSON.parse(response.text);
  
  // Convert indices back to hex colors for easier handling in the UI
  const hexGrid = data.grid.map((row: number[]) => 
    row.map((index: number) => data.palette[index] || "#000000")
  );

  return {
    grid: hexGrid,
    palette: data.palette,
  };
}

export async function refinePixelArt(base64Image: string, prompt: string, resolution: number): Promise<PixelArtData> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Image.split(",")[1],
        },
      },
      {
        text: `This is a pixelated version of an image. Refine it to look like professional ${resolution}x${resolution} pixel art. 
        Follow this prompt for style: "${prompt}".
        Return a JSON object with:
        - "palette": an array of hex color strings used.
        - "grid": a 2D array of indices referring to the palette array.`,
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          palette: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          grid: {
            type: Type.ARRAY,
            items: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
            },
          },
        },
        required: ["palette", "grid"],
      },
    },
  });

  const data = JSON.parse(response.text);
  const hexGrid = data.grid.map((row: number[]) => 
    row.map((index: number) => data.palette[index] || "#000000")
  );

  return {
    grid: hexGrid,
    palette: data.palette,
  };
}
