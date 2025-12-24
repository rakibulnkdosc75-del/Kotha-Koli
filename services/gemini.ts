
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async generateStory(prompt: string, maturity: string): Promise<string> {
    const systemInstruction = `You are a master Bengali storyteller, novelist, and litterateur. 
    You write high-quality stories, novels (Uponnash), and short stories in beautiful, fluent Bengali.
    Current Maturity Level: ${maturity === 'mature' ? 'Adult (18+), explicit themes allowed where narratively relevant' : 'General Audience'}.
    Always respond in Bengali. Use rich vocabulary.`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.8,
      },
    });

    return response.text || '';
  }

  async generateStoryImage(prompt: string): Promise<string | undefined> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A cinematic, high-quality illustration for a Bengali story: ${prompt}` }],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
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
    const response = await this.ai.models.generateContent({
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
    // Check for Veo Key selection (handled via window.aistudio in UI)
    const veofai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    let operation = await veofai.models.generateVideos({
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
      operation = await veofai.operations.getVideosOperation({ operation: operation });
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
