
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

export type StoryTone = 'Standard' | 'Romantic' | 'Erotic' | 'Dark' | 'Psychological';
export type ImageQuality = '1K' | '2K' | '4K';

export interface Story {
  id: string;
  title: string;
  content: string;
  genre: string;
  maturity: MaturityLevel;
  tone?: StoryTone;
  updatedAt: number;
  assets: StoryAsset[];
}

export interface StoryAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  quality?: ImageQuality;
}

export interface AppSettings {
  language: string;
  maturityLevel: MaturityLevel;
  isConfirmedAdult: boolean;
  blurMatureThumbnails: boolean;
  defaultImageQuality: ImageQuality;
  apiKey?: string;
}
