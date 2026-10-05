import type { Thought, ThoughtResponse, Blocked, Helpline, Emotion, ReplyType } from './types';
import { projectId, publicAnonKey } from '../supabase/info';
import fixtureThoughts from '../fixtures/thoughts.json';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/server`;

const getHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'apikey': publicAnonKey,
    'Authorization': `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['X-Owner-Token'] = token;
  }
  return headers;
};

// Owner token storage helpers
export const getOwnerToken = (id: string): string | undefined => {
  try {
    const raw = localStorage.getItem('ember_owner_tokens');
    if (!raw) return undefined;
    const tokens = JSON.parse(raw);
    return tokens[id];
  } catch {
    return undefined;
  }
};

export const saveOwnerToken = (id: string, token: string) => {
  try {
    const raw = localStorage.getItem('ember_owner_tokens');
    const tokens = raw ? JSON.parse(raw) : {};
    tokens[id] = token;
    localStorage.setItem('ember_owner_tokens', JSON.stringify(tokens));
  } catch (e) {
    console.error('Failed to save owner token:', e);
  }
};

export const api = {
  /**
   * Fetch all thoughts with fallback to fixtures during Day 1 development / cold starts
   */
  async getThoughts(): Promise<Thought[]> {
    try {
      const res = await fetch(`${SERVER_URL}/thoughts`, {
        method: 'GET',
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (err) {
      console.warn('API getThoughts failed or server not ready, using fixtures:', err);
    }
    // Return fixture thoughts so UI functions immediately
    return fixtureThoughts as unknown as Thought[];
  },

  /**
   * Create a new thought (Server owns write, ID, positions, and returns ownerToken)
   */
  async createThought(payload: {
    text: string;
    emotion?: Emotion;
    authorId: string;
    country?: string;
  }): Promise<{ thought: Thought; ownerToken: string; helpline?: Helpline } | Blocked> {
    try {
      const res = await fetch(`${SERVER_URL}/thoughts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.status === 422) {
        const blocked: Blocked = await res.json();
        return blocked;
      }

      if (res.status === 429) {
        throw new Error('Rate limited. Please take a breath and try again shortly.');
      }

      if (res.ok) {
        const data = await res.json();
        if (data.ownerToken && data.thought?.id) {
          saveOwnerToken(data.thought.id, data.ownerToken);
        }
        return data;
      }
    } catch (err) {
      console.warn('Create thought server request failed, generating client fallback preview:', err);
    }

    // Client-side fallback for Day 1 offline UI work
    const fallbackId = 'thought_' + Date.now();
    const fallbackToken = 'token_' + Math.random().toString(36).slice(2);
    saveOwnerToken(fallbackId, fallbackToken);

    const fallbackThought: Thought = {
      id: fallbackId,
      text: payload.text,
      timestamp: new Date().toISOString(),
      rotation: (Math.random() - 0.5) * 4,
      x: 600 + (Math.random() - 0.5) * 200,
      y: 400 + (Math.random() - 0.5) * 200,
      width: 290,
      variant: 'warm',
      emotion: payload.emotion,
      authorId: payload.authorId,
      responses: [],
      aiStatus: 'waiting',
      lantern: {
        palette: ['#fde047', '#f97316', '#7c2d12'],
        glow: 0.85,
        flicker: 0.4,
        shape: 'round',
        sound: {
          mood: 'night',
          instrument: 'pad',
          key: 'D minor',
          tempo: 54,
        },
        caption: 'warm flame in the night',
      },
      showHelp: false,
      isExample: false,
    };

    return {
      thought: fallbackThought,
      ownerToken: fallbackToken,
    };
  },

  /**
   * Delete a thought with owner token
   */
  async deleteThought(id: string, token: string): Promise<boolean> {
    try {
      const res = await fetch(`${SERVER_URL}/thoughts/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token),
      });
      return res.status === 204 || res.ok;
    } catch (err) {
      console.error('Delete thought failed:', err);
      return false;
    }
  },

  /**
   * Add a reply to a thought
   */
  async addReply(
    thoughtId: string,
    body: {
      type: ReplyType;
      content?: string;
      drawingData?: string;
      audioData?: string;
      durationSec?: number;
      authorId: string;
    }
  ): Promise<{ reply: ThoughtResponse; ownerToken: string } | Blocked> {
    try {
      const res = await fetch(`${SERVER_URL}/thoughts/${thoughtId}/replies`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      if (res.status === 422) {
        return (await res.json()) as Blocked;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.ownerToken && data.reply?.id) {
          saveOwnerToken(data.reply.id, data.ownerToken);
        }
        return data;
      }
    } catch (err) {
      console.warn('Add reply request failed, creating local preview:', err);
    }

    const replyId = 'reply_' + Date.now();
    const token = 'token_' + Math.random().toString(36).slice(2);
    saveOwnerToken(replyId, token);

    return {
      reply: {
        id: replyId,
        type: body.type,
        content: body.content || '',
        timestamp: new Date().toISOString(),
        isAI: false,
        drawingData: body.drawingData,
        audioUrl: body.audioData,
        authorId: body.authorId,
      },
      ownerToken: token,
    };
  },

  /**
   * Delete a reply
   */
  async deleteReply(thoughtId: string, replyId: string, token: string): Promise<boolean> {
    try {
      const res = await fetch(`${SERVER_URL}/thoughts/${thoughtId}/replies/${replyId}`, {
        method: 'DELETE',
        headers: getHeaders(token),
      });
      return res.status === 204 || res.ok;
    } catch (err) {
      console.error('Delete reply failed:', err);
      return false;
    }
  },
};
