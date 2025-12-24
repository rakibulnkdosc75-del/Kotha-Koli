
export enum View {
  EDITOR = 'editor',
  LIBRARY = 'library',
  SETTINGS = 'settings',
  VOICE_STUDIO = 'voice_studio',
  MEDIA_LAB = 'media_lab'
}

export enum MaturityLevel {
  GENERAL = 'general',
  MATURE = 'mature' // 18+
}

export interface Story {
  id: string;
  title: string;
  content: string;
  genre: string;
  maturity: MaturityLevel;
  updatedAt: number;
  assets: StoryAsset[];
}

export interface StoryAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
}

export interface AppSettings {
  language: string;
  maturityLevel: MaturityLevel;
  apiKey?: string;
}
