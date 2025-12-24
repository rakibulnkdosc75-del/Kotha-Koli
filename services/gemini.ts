
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";

export class GeminiService {
  // Use a method to get a fresh instance to avoid stale keys
  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateStory(prompt: string, maturity: string, tone: string = 'Standard'): Promise<string> {
    const isMature = maturity === 'mature';
    const ai = this.getAI();
    const systemInstruction = `You are an elite Bengali litterateur and novelist. 
    You specialize in high-quality Bengali prose.
    ${isMature ? `
    SETTING: MATURE (18+). 
    You are permitted and encouraged to explore explicit adult themes, intense psychological drama, and sensual literary descriptions (Adi-Ras) where it serves the narrative. 
    Tone context: ${tone}.` : `
    SETTING: GENERAL AUDIENCE.
    Write wholesome, engaging, and family-friendly stories.`}
    Always respond in beautiful, fluent Bengali.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.85,
      },
    });

    return response.text || '';
  }

  async generateStoryImage(prompt: string, isMature: boolean = false, quality: string = '1K'): Promise<string | undefined> {
    const ai = this.getAI();
    const contextPrefix = isMature ? "Atmospheric, moody, cinematic, sensual aesthetic, artistic adult fiction style: " : "Wholesome, vibrant, cinematic: ";
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: `${contextPrefix} ${prompt}` }],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: quality as any,
        },
      },
    });

    for (const part of response.candidates?.[0]?.content.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  }

  async editImage(base64Image: string, editPrompt: string): Promise<string | undefined> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: 'image/png',
            },
          },
          { text: editPrompt },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  }

  async generateVideoFromImage(base64Image: string, prompt: string): Promise<string | undefined> {
    const ai = this.getAI();
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: base64Image.split(',')[1],
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
      const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await videoResponse.blob();
      return URL.createObjectURL(blob);
    }
    return undefined;
  }
}

export const gemini = new GeminiService();
