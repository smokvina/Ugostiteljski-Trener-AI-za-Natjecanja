import { GoogleGenAI, Chat, Part } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';
import { SendMessagePayload } from "../types";

// Initialize the Gemini AI model
// The API key is automatically provided by the environment
let ai: GoogleGenAI;
try {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
// Fix: Added curly braces to the catch block for correct syntax.
} catch (error) {
  console.error("Failed to initialize GoogleGenAI. Make sure API_KEY is set.", error);
  // We can't proceed without the AI instance, but we won't crash the app.
  // The UI will show an error state.
}

export const initializeChat = (): Chat | null => {
  if (!ai) return null;

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      // The tools are available if the model decides to use them based on conversation
      tools: [{ googleSearch: {} }, { googleMaps: {} }],
    },
  });
  return chat;
};

export const sendMessageToAI = async (chat: Chat, payload: SendMessagePayload): Promise<string> => {
  try {
    const parts: (string | Part)[] = [payload.text];
    
    if (payload.file) {
      parts.push({
        inlineData: {
          data: payload.file.data,
          mimeType: payload.file.mimeType,
        }
      });
    }

    const response = await chat.sendMessage({ message: parts });
    return response.text;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    return "Došlo je do pogreške prilikom komunikacije s AI. Molimo pokušajte ponovo.";
  }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!ai) return null;
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};