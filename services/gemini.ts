
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";

export class GeminiService {
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

  async translateToVisualPrompt(bengaliText: string, isMature: boolean): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate this Bengali story segment into a highly descriptive English visual prompt for a cinematic video generator. 
      Maintain the mood: ${isMature ? 'Atmospheric, artistic, sensual, moody adult drama' : 'Wholesome, cinematic, vibrant'}. 
      Text: "${bengaliText}"`,
      config: {
        systemInstruction: "Respond ONLY with the English prompt string. No explanations."
      }
    });
    return response.text || bengaliText;
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

  async generateVideo(prompt: string, base64Image?: string): Promise<string | undefined> {
    const ai = this.getAI();
    const payload: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    };

    if (base64Image) {
      payload.image = {
        imageBytes: base64Image.split(',')[1],
        mimeType: 'image/png',
      };
    }
    
    let operation = await ai.models.generateVideos(payload);

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
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
