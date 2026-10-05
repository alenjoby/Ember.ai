// API Types matching docs/01-API-CONTRACT.md

export type Emotion = 'lonely' | 'grateful' | 'anxious' | 'hopeful' | 'grieving' | 'joyful';
export type ReplyType = 'note' | 'voice' | 'drawing' | 'sticker';

export interface ThoughtResponse {
  id: string;
  type: ReplyType;
  content: string;          // note text | voice transcript | sticker id/emoji | '' for drawing
  timestamp: string;        // ISO string
  isAI: boolean;            // set by server only
  drawingData?: string;     // Storage URL or data URL
  audioUrl?: string;        // Storage URL
  authorId?: string;        // anonymous id from localStorage
}

export interface Lantern {
  palette: [string, string, string];      // hex colors: [core, glow, edge]
  glow: number;                           // 0..1 brightness
  flicker: number;                        // 0..1 how restless the flame is
  shape: 'round' | 'tall' | 'paper' | 'star';
  sound: {
    mood: 'rain' | 'wind' | 'ocean' | 'fire' | 'night' | 'birds' | 'chimes';
    instrument: 'pad' | 'piano' | 'cello' | 'flute' | 'bells';
    key: string;                          // e.g. "D minor", "G major"
    tempo: number;                        // 40..90 bpm
  };
  caption?: string;                       // optional <= 6 words
}

export interface Thought {
  id: string;
  text: string;
  timestamp: string;
  rotation: number;
  x: number;
  y: number;
  width: number;
  variant: 'warm' | 'light' | 'teal' | 'rose';
  emotion?: Emotion;
  authorId?: string;
  responses: ThoughtResponse[];          // oldest first
  aiStatus: 'waiting' | 'replying' | 'done' | 'skipped';
  lantern: Lantern | null;               // null until generated (~2-5s after create)
  showHelp: boolean;                     // true if crisis detected -> show help card
  isExample: boolean;                    // seeded demo content -> show small "example" tag
}

export interface Helpline {
  country: string;
  name: string;
  phone?: string;
  url: string;
}

export interface Blocked {
  blocked: true;
  reason: string;
  severity: 'mild' | 'moderate' | 'severe';
}
