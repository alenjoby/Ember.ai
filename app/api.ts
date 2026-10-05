import type { Thought, ThoughtResponse, Blocked, Helpline, Emotion, ReplyType } from './types';
import { projectId, publicAnonKey } from '../supabase/info';
import fixtureThoughts from '../fixtures/thoughts.json';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/server`;

const getHeaders = (token?: string, adminToken?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'apikey': publicAnonKey,
    'Authorization': `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['X-Owner-Token'] = token;
  }
  const resolvedAdminToken = adminToken || localStorage.getItem('ember_admin_token') || (localStorage.getItem('ember_admin') === 'true' ? 'admin' : undefined);
  if (resolvedAdminToken) {
    headers['X-Admin-Token'] = resolvedAdminToken;
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
   * Fetch all thoughts.
   * If server returns an array (including an empty array []), return it as-is.
   * Only fall back to fixtures if the network or endpoint completely fails to respond.
   */
  async getThoughts(): Promise<Thought[]> {
    try {
      const res = await fetch(`${SERVER_URL}/thoughts`, {
        method: 'GET',
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
    } catch (err) {
      console.warn('API getThoughts failed or server not ready, using fixtures as fallback:', err);
      return fixtureThoughts as unknown as Thought[];
    }
    return [];
  },

  /**
   * Create a new thought (Server owns write, ID, positions, and returns ownerToken).
   * Never fakes a local post on refusal or network error.
   */
  async createThought(payload: {
    text: string;
    emotion?: Emotion;
    authorId: string;
    country?: string;
  }): Promise<{ thought: Thought; ownerToken: string; helpline?: Helpline } | Blocked> {
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
      throw new Error('Take a breath, try again in a minute.');
    }

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      const message = errorBody?.error?.message || `Server error (${res.status}). Your thought was not sent.`;
      throw new Error(message);
    }

    const data = await res.json();
    if (data.ownerToken && data.thought?.id) {
      saveOwnerToken(data.thought.id, data.ownerToken);
    }
    return data;
  },

  /**
   * Delete a thought with owner token or admin token
   */
  async deleteThought(id: string, token?: string, adminToken?: string): Promise<boolean> {
    try {
      const res = await fetch(`${SERVER_URL}/thoughts/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token, adminToken),
      });
      return res.status === 204 || res.ok;
    } catch (err) {
      console.error('Delete thought failed:', err);
      return false;
    }
  },

  /**
   * Add a reply to a thought.
   * Never fakes a local reply on refusal or network error.
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
    const res = await fetch(`${SERVER_URL}/thoughts/${thoughtId}/replies`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (res.status === 422) {
      return (await res.json()) as Blocked;
    }

    if (res.status === 429) {
      throw new Error('Take a breath, try again in a minute.');
    }

    if (res.status === 413) {
      throw new Error("That's a bit too long, try a shorter recording or drawing.");
    }

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      const message = errorBody?.error?.message || `Server error (${res.status}). Your reply was not sent.`;
      throw new Error(message);
    }

    const data = await res.json();
    if (data.ownerToken && data.reply?.id) {
      saveOwnerToken(data.reply.id, data.ownerToken);
    }
    return data;
  },

  /**
   * Delete a reply with owner token or admin token
   */
  async deleteReply(thoughtId: string, replyId: string, token?: string, adminToken?: string): Promise<boolean> {
    try {
      const res = await fetch(`${SERVER_URL}/thoughts/${thoughtId}/replies/${replyId}`, {
        method: 'DELETE',
        headers: getHeaders(token, adminToken),
      });
      return res.status === 204 || res.ok;
    } catch (err) {
      console.error('Delete reply failed:', err);
      return false;
    }
  },
};
