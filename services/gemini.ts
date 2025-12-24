
import { GoogleGenAI, Modality } from "@google/genai";

const MAX_CONTEXT_CHARS = 12000; 
const MAX_TTS_CHARS = 4000;

export class GeminiService {
  private getAI() {
    // Creating instance right before use to ensure latest API Key
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing. Please select an API key in settings.");
    }
    return new GoogleGenAI({ apiKey });
  }

  private truncateContext(content: string): string {
    if (content.length <= MAX_CONTEXT_CHARS) return content;
    return "..." + content.slice(-MAX_CONTEXT_CHARS);
  }

  async generateStory(prompt: string, maturity: string, tone: string = 'Standard', dialect: string = 'Bengali'): Promise<string> {
    try {
      const ai = this.getAI();
      const isMature = maturity === 'mature';
      
      const systemInstruction = `You are a world-class Bengali novelist and literary mastermind specializing in ${dialect}. 
      Your writing is evocative, emotionally deep, and uses sophisticated Bengali vocabulary.
      ${isMature ? `
      MATURE MODE (18+): You are permitted and encouraged to write high-quality adult fiction. This includes explicit romantic encounters, intense psychological trauma, eroticism, and dark realism where narratively appropriate. 
      Tone: ${tone}.` : `
      GENERAL MODE: Write family-friendly, wholesome, and engaging literature.`}
      Always respond ONLY in beautiful ${dialect}. No English conversational filler.`;

      const truncatedPrompt = this.truncateContext(prompt);

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: truncatedPrompt,
        config: {
          systemInstruction,
          temperature: 0.9,
          topP: 0.95,
        },
      });

      if (!response.text) throw new Error("AI returned empty content.");
      return response.text;
    } catch (error: any) {
      console.error("Story Generation Error:", error);
      throw new Error(error.message || "Narrative generation failed.");
    }
  }

  async translateToVisualPrompt(bengaliText: string, isMature: boolean): Promise<string> {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a professional English artistic prompt for an image generator based on this scene. 
        Mood: ${isMature ? 'Atmospheric, cinematic, sensual, moody' : 'Cinematic, vibrant, detailed'}. 
        Scene: "${bengaliText.slice(-1500)}"`,
        config: {
          systemInstruction: "Respond with the English prompt ONLY."
        }
      });
      return response.text || "Cinematic Bengali scene, high detail";
    } catch (error) {
      return "Atmospheric cinematic lighting, ultra-high definition photography";
    }
  }

  async generateStoryImage(prompt: string, isMature: boolean = false, quality: string = '1K'): Promise<string | undefined> {
    try {
      const ai = this.getAI();
      const style = isMature ? "Moody, sensual, cinematic adult fiction aesthetic: " : "Beautiful, vibrant, cinematic literary illustration: ";
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: `${style} ${prompt.slice(-800)}` }] },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: quality as any,
          },
        },
      });

      const imgPart = response.candidates?.[0]?.content.parts.find(p => p.inlineData);
      return imgPart ? `data:image/png;base64,${imgPart.inlineData.data}` : undefined;
    } catch (error: any) {
      console.error("Image Gen Error:", error);
      throw error;
    }
  }

  async editImage(base64Image: string, editPrompt: string): Promise<string | undefined> {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/png' } },
            { text: editPrompt },
          ],
        },
      });
      const imgPart = response.candidates?.[0]?.content.parts.find(p => p.inlineData);
      return imgPart ? `data:image/png;base64,${imgPart.inlineData.data}` : undefined;
    } catch (error) {
      console.error("Image Edit Error:", error);
      throw error;
    }
  }

  async generateVideo(prompt: string, base64Image?: string): Promise<string | undefined> {
    try {
      const ai = this.getAI();
      const payload: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt.slice(0, 500),
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
      };

      if (base64Image) {
        payload.image = { imageBytes: base64Image.split(',')[1], mimeType: 'image/png' };
      }
      
      let operation = await ai.models.generateVideos(payload);
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 8000));
        operation = await ai.operations.getVideosOperation({ operation });
      }

      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        const videoResponse = await fetch(`${uri}&key=${process.env.API_KEY}`);
        const blob = await videoResponse.blob();
        return URL.createObjectURL(blob);
      }
      return undefined;
    } catch (error) {
      console.error("Video Generation Error:", error);
      throw error;
    }
  }

  async generateSpeech(text: string, tone: string = 'Standard'): Promise<string | undefined> {
    try {
      const ai = this.getAI();
      const voice = tone === 'Romantic' || tone === 'Erotic' ? 'Kore' : 'Zephyr';
      const cleanText = text.length > MAX_TTS_CHARS ? text.slice(0, MAX_TTS_CHARS) : text;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Narrate this Bengali text naturally with a ${tone.toLowerCase()} tone: ${cleanText}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      });

      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (error) {
      console.error("Speech Generation Error:", error);
      return undefined;
    }
  }
}

export const gemini = new GeminiService();
