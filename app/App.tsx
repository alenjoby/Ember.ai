import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MainSpace } from './components/MainSpace';
import { ComposeModal } from './components/ComposeModal';
import { ThoughtDetailModal } from './components/ThoughtDetailModal';
import { DrawModal } from './components/DrawModal';
import { HistoryModal } from './components/HistoryModal';
import { ReplyDetailModal } from './components/ReplyDetailModal';
import { projectId, publicAnonKey } from '../supabase/info';
import { supabase } from './supabaseClient';
import { ScreenGlow } from './components/ScreenGlow';
import { Onboarding } from './components/Onboarding';
import { Sparkles } from 'lucide-react';
import { api, getOwnerToken } from './api';
import fixtureThoughts from '../fixtures/thoughts.json';
import { CrisisCard, detectBrowserCountry } from './components/CrisisCard';
import type { Helpline } from './types';

const getAnonUserId = () => {
  let uid = localStorage.getItem('anon_user_id');
  if (!uid) {
    uid = 'user_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('anon_user_id', uid);
  }
  return uid;
};

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/server`;

export interface ThoughtResponse {
  id: string;
  type: 'note' | 'voice' | 'drawing' | 'sticker';
  content: string;
  timestamp: Date;
  isAI?: boolean;
  drawingData?: string;
  audioUrl?: string;
  authorId?: string;
}

export interface Thought {
  id: string;
  text: string;
  timestamp: Date;
  rotation: number;
  x: number;
  y: number;
  variant: 'warm' | 'light' | 'teal' | 'rose';
  responses: ThoughtResponse[];
  aiResponded?: boolean;
  glowing?: boolean;
  width: number;
  authorId?: string;
  emotion?: string;
  aiStatus?: 'waiting' | 'replying' | 'done' | 'skipped';
  lantern?: any;
  showHelp?: boolean;
  isExample?: boolean;
}

const getRandomOffset = (range: number) => (Math.random() - 0.5) * range;

type ActiveView = 'space' | 'compose' | 'thoughtDetail' | 'history' | 'replyDetail';
type TutorialStep = 'none' | 'hud' | 'star' | 'reply' | 'complete';

const initialThoughts: Thought[] = (fixtureThoughts as any[]).map((t: any) => ({
  ...t,
  timestamp: new Date(t.timestamp),
  responses: (t.responses || []).map((r: any) => ({
    ...r,
    timestamp: new Date(r.timestamp),
  })),
}));

export default function App() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('space');
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);
  const [selectedReply, setSelectedReply] = useState<ThoughtResponse | null>(null);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [aiGlowThoughtId, setAiGlowThoughtId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [crisisHelpline, setCrisisHelpline] = useState<Helpline | null>(null);
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>('none');
  const [tutorialReplies, setTutorialReplies] = useState<ThoughtResponse[]>([]);

  useEffect(() => {
    if (!localStorage.getItem('hasCompletedOnboarding')) {
      setShowOnboarding(true);
    }
  }, []);
  const [activeToast, setActiveToast] = useState<{ id: string; thought: Thought } | null>(null);
  const [panToTarget, setPanToTarget] = useState<{ x: number; y: number } | null>(null);
  const [globalAiAudioPlaying, setGlobalAiAudioPlaying] = useState(false);
  const [voiceCount, setVoiceCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(loading);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  const anonUserId = useRef(getAnonUserId()).current;
  
  const voiceCountRef = useRef(voiceCount);
  useEffect(() => {
    voiceCountRef.current = voiceCount;
  }, [voiceCount]);

  // Demo mode: server says how many simulated people to add to the live count (0 when off)
  const [demoOnline, setDemoOnline] = useState(0);
  const [demoEnabled, setDemoEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    const loadDemo = () =>
      fetch(`${SERVER_URL}/demo`, { headers: { apikey: publicAnonKey, Authorization: `Bearer ${publicAnonKey}` } })
        .then(r => r.json())
        .then(d => { setDemoOnline(d.online ?? 0); setDemoEnabled(!!d.enabled); })
        .catch(() => {});
    loadDemo();
    const id = setInterval(loadDemo, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);


  // Fetch thoughts — reads directly from the KV table to avoid edge function cold-start/EPIPE issues
  const fetchThoughts = useCallback(async () => {
    try {
      const data = await api.getThoughts();
      const list = data || [];
      
      let savedPositions: Record<string, { x: number; y: number }> = {};
      try {
        const raw = localStorage.getItem('ember_positions');
        if (raw) savedPositions = JSON.parse(raw);
      } catch (e) {
        console.warn('Could not read ember_positions:', e);
      }

      const parsedData = list.map((t: any) => {
        const saved = savedPositions[t.id];
        return {
          ...t,
          x: saved ? saved.x : t.x,
          y: saved ? saved.y : t.y,
          timestamp: new Date(t.timestamp),
          responses: (t.responses || []).map((r: any) => ({
            ...r,
            timestamp: new Date(r.timestamp),
          })),
        };
      });

      // Merge: DB is the source of truth, but keep locally-added thoughts
      // that haven't been persisted yet so they don't vanish on the next poll.
      setThoughts(prev => {
        const dbIds = new Set(parsedData.map((t: Thought) => t.id));
        // Keep ONLY very fresh local thoughts (created in the last 15s by us) that aren't in the DB yet
        const localOnly = prev.filter(t => {
          if (dbIds.has(t.id)) return false;
          const isFresh = (Date.now() - new Date(t.timestamp).getTime()) < 15000;
          return t.authorId === anonUserId && isFresh;
        });
        return [...parsedData, ...localOnly];
      });
    } catch (err) {
      console.warn('API getThoughts failed:', err);
    } finally {
      if (loadingRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [anonUserId]);

  // Dev-only demo toggle: admin passcode once per session -> admin token -> POST /demo
  const toggleDemo = useCallback(async () => {
    const headers = { apikey: publicAnonKey, Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' };
    let adminToken = sessionStorage.getItem('ember_demo_admin_token');
    if (!adminToken) {
      const passcode = prompt('Admin passcode to switch demo mode:');
      if (!passcode) return;
      const res = await fetch(`${SERVER_URL}/verify-admin`, { method: 'POST', headers, body: JSON.stringify({ passcode }) });
      const data = await res.json().catch(() => ({}));
      if (!data.adminToken) { alert('Incorrect passcode.'); return; }
      adminToken = data.adminToken as string;
      sessionStorage.setItem('ember_demo_admin_token', adminToken);
    }
    const res = await fetch(`${SERVER_URL}/demo`, {
      method: 'POST',
      headers: { ...headers, 'X-Admin-Token': adminToken },
      body: JSON.stringify({ enabled: !demoEnabled }),
    });
    if (res.status === 403) {
      sessionStorage.removeItem('ember_demo_admin_token'); // expired token: ask again next click
      alert('Admin session expired, click again.');
      return;
    }
    const data = await res.json().catch(() => null);
    if (!data) return;
    setDemoEnabled(!!data.enabled);
    setDemoOnline(data.online ?? 0);
    fetchThoughts();
  }, [demoEnabled, fetchThoughts]);

  useEffect(() => {
    fetchThoughts();

    // Polling fallback: re-fetch every 10s in case Realtime silently fails
    const pollInterval = setInterval(() => {
      fetchThoughts();
    }, 10000);

    // Debounce timer for realtime refetches
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const triggerDebouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchThoughts();
      }, 300);
    };

    // Subscribe to thoughts and replies table changes (F1 spec)
    const channel = supabase
      .channel('realtime-thoughts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'thoughts' },
        () => triggerDebouncedFetch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'replies' },
        () => triggerDebouncedFetch()
      )
      .subscribe();

    // Subscribe to presence
    const presenceChannel = supabase.channel('online-users');

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        // Track unique users online (excluding multiple tabs from the same user)
        const uniqueUserIds = new Set<string>();
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.userId) {
              uniqueUserIds.add(p.userId);
            }
          });
        });
        
        const count = uniqueUserIds.size > 0 ? uniqueUserIds.size : Object.keys(state).length;
        setVoiceCount(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ userId: anonUserId, onlineAt: new Date() });
        }
      });

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };
  }, [fetchThoughts]);

  const handleToastClick = useCallback((thought: Thought) => {
    setPanToTarget({ x: thought.x, y: thought.y });
    setAiGlowThoughtId(thought.id);
    setTimeout(() => {
      setAiGlowThoughtId(current => current === thought.id ? null : current);
    }, 4000);
    setActiveToast(null);
  }, []);

  const handleDeleteThought = useCallback(async (thoughtId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to return this thought to ash?");
    if (!confirmDelete) return;

    try {
      setThoughts(prev => prev.filter(t => t.id !== thoughtId));
      setActiveView('space');
      setSelectedThought(null);

      const token = getOwnerToken(thoughtId) || '';
      const adminToken = localStorage.getItem('ember_admin_token') || undefined;
      await api.deleteThought(thoughtId, token, adminToken);
    } catch (err) {
      console.error("Error deleting thought:", err);
      fetchThoughts();
    }
  }, [fetchThoughts]);

  const handleDeleteReply = useCallback(async (thoughtId: string, replyId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this reply?");
    if (!confirmDelete) return;

    try {
      setThoughts(prev => prev.map(t => {
        if (t.id === thoughtId) {
          return { ...t, responses: t.responses.filter(r => r.id !== replyId) };
        }
        return t;
      }));

      setSelectedThought(prev => {
        if (prev && prev.id === thoughtId) {
          return { ...prev, responses: prev.responses.filter(r => r.id !== replyId) };
        }
        return prev;
      });

      const token = getOwnerToken(replyId) || '';
      const adminToken = localStorage.getItem('ember_admin_token') || undefined;
      await api.deleteReply(thoughtId, replyId, token, adminToken);
    } catch (err) {
      console.error("Error deleting reply:", err);
      fetchThoughts();
    }
  }, [fetchThoughts]);

  const handleInputClick = () => setActiveView('compose');

  const handleThoughtClick = (thought: Thought) => {
    setSelectedThought(thought);
    setActiveView('thoughtDetail');
    if (tutorialStep === 'star') {
      setTutorialStep('reply');
    }
  };

  const handleHistoryThoughtClick = useCallback((thought: Thought) => {
    setActiveView('space');
    setPanToTarget({ x: thought.x, y: thought.y });
    setAiGlowThoughtId(thought.id);
    setTimeout(() => {
      setAiGlowThoughtId(current => current === thought.id ? null : current);
    }, 5000);
  }, []);

  const handleReplyClick = (thought: Thought, reply: ThoughtResponse) => {
    setSelectedThought(thought);
    setSelectedReply(reply);
    setActiveView('replyDetail');
  };

  const handleCloseModal = () => {
    setActiveView('space');
    setSelectedThought(null);
    setSelectedReply(null);
    if (tutorialStep === 'reply') {
      setTutorialStep('star');
    }
  };

  const handleSubmitThought = useCallback(async (text: string, emotion?: string) => {
    const basePositions = [
      { x: -300, y: -200 },
      { x: 300, y: -200 },
      { x: 0, y: 300 },
      { x: -400, y: 400 },
      { x: 400, y: 300 }
    ];
    
    const base = basePositions[Math.floor(Math.random() * basePositions.length)];
    
    const country = detectBrowserCountry();
    try {
      const res = await api.createThought({
        text,
        emotion: emotion as any,
        authorId: anonUserId,
        country,
      });

      if ('blocked' in res && res.blocked) {
        alert(res.reason || "This message couldn't be released.");
        return;
      }

      if ('thought' in res) {
        const created: Thought = {
          ...res.thought,
          timestamp: new Date(res.thought.timestamp),
          responses: (res.thought.responses || []).map((r: any) => ({
            ...r,
            timestamp: new Date(r.timestamp),
          })),
        };

        setThoughts(prev => [...prev.filter(t => t.id !== created.id), created]);
        setActiveView('space');

        if (res.helpline) {
          setCrisisHelpline(res.helpline);
        }
      }
    } catch (err: any) {
      console.error('Error creating thought:', err);
      alert(err.message || 'Network error while releasing thought.');
      throw err;
    }
  }, [anonUserId]);

  const handleAddResponse = useCallback(async (
    thoughtId: string,
    response: Omit<ThoughtResponse, 'id' | 'timestamp'>
  ) => {
    const newResponse: ThoughtResponse = {
      ...response,
      id: Date.now().toString(),
      timestamp: new Date(),
      authorId: anonUserId,
    };

    if (thoughtId === 'thought-tutorial-1') {
      const mockReply: ThoughtResponse = {
        ...response,
        id: Date.now().toString(),
        timestamp: new Date(),
        authorId: anonUserId,
      };
      setTutorialReplies(prev => [...prev, mockReply]);
      setTimeout(() => {
        setTutorialStep('complete');
      }, 1500);
      return;
    }

    try {
      const res = await api.addReply(thoughtId, {
        type: response.type,
        content: response.content,
        drawingData: response.drawingData,
        audioData: response.audioUrl,
        authorId: anonUserId,
      });

      if ('blocked' in res && res.blocked) {
        alert(res.reason || "This reply couldn't be sent.");
        return;
      }

      if ('reply' in res) {
        const replyObj: ThoughtResponse = {
          ...res.reply,
          timestamp: new Date(res.reply.timestamp),
        };

        setThoughts(prev => {
          const updated = prev.map(t => {
            if (t.id === thoughtId) {
              return { ...t, responses: [...t.responses, replyObj] };
            }
            return t;
          });
          const updatedSelected = updated.find(t => t.id === thoughtId);
          if (updatedSelected) setSelectedThought(updatedSelected);
          return updated;
        });
      }
    } catch (err: any) {
      console.error('Error adding reply:', err);
      alert(err.message || 'Failed to send reply.');
      throw err;
    }
  }, [anonUserId]);

  const handleThoughtMove = useCallback((id: string, x: number, y: number) => {
    try {
      const raw = localStorage.getItem('ember_positions');
      const positions = raw ? JSON.parse(raw) : {};
      positions[id] = { x, y };
      localStorage.setItem('ember_positions', JSON.stringify(positions));
    } catch (e) {
      console.warn('Could not save ember_positions to localStorage:', e);
    }
    setThoughts(prev => prev.map(t => (t.id === id ? { ...t, x, y } : t)));
  }, []);

  const handleSendDrawing = useCallback((drawingData: string) => {
    if (selectedThought) {
      handleAddResponse(selectedThought.id, {
        type: 'drawing',
        content: '',
        drawingData,
      });
    }
    setShowDrawModal(false);
  }, [selectedThought, handleAddResponse]);

  const tutorialThought = useMemo<Thought | null>(() => {
    if (tutorialStep === 'none') return null;
    return {
      id: 'thought-tutorial-1',
      text: "I'm glad you drifted here. Tap on this lantern to see how we respond to each other.",
      timestamp: new Date(),
      rotation: -2,
      x: 0,
      y: -80,
      variant: 'warm',
      responses: tutorialReplies,
      aiStatus: 'done',
      width: 280,
      authorId: 'system',
      emotion: 'grateful',
      showHelp: false,
      isExample: true,
      lantern: {
        palette: ['#D9F2B4', '#8DBF5A', '#3E5A22'],
        glow: 0.65,
        flicker: 0.3,
        shape: 'round',
        sound: { mood: 'ocean', instrument: 'piano', key: 'C major', tempo: 60 },
        caption: 'soft ripples on water',
      },
    };
  }, [tutorialStep, tutorialReplies]);

  const activeThoughts = useMemo(() => {
    const timeFiltered = thoughts.filter(t => (Date.now() - t.timestamp.getTime()) < 24 * 60 * 60 * 1000);
    if (tutorialThought) {
      return [tutorialThought];
    }
    return timeFiltered;
  }, [thoughts, tutorialThought]);

  if (loading) {
    return (
      <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-[#050308] gap-6 select-none">
        <div className="relative flex flex-col items-center justify-center">
          {/* Breathing flame aura */}
          <motion.div
            className="absolute w-32 h-32 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(214,106,62,0.35) 0%, rgba(214,106,62,0.08) 50%, transparent 75%)',
            }}
            animate={{
              scale: [0.85, 1.25, 0.85],
              opacity: [0.5, 0.9, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Breathing flame icon / logo */}
          <motion.div
            animate={{
              scale: [0.95, 1.05, 0.95],
              filter: [
                'drop-shadow(0 0 12px rgba(214,106,62,0.4))',
                'drop-shadow(0 0 28px rgba(214,106,62,0.8))',
                'drop-shadow(0 0 12px rgba(214,106,62,0.4))',
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="relative z-10 flex flex-col items-center"
          >
            <img 
              src="https://i.imgur.com/5nagvWz.png" 
              alt="Ember Logo" 
              className="h-20 w-auto object-contain"
            />
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-2 relative z-10">
          <motion.p
            className="text-[#f9f3eb] text-[16px] tracking-wide"
            style={{ fontFamily: "'Alegreya', serif", fontWeight: 400 }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            lighting the lanterns…
          </motion.p>
          <div className="w-24 h-[2px] bg-white/10 rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full bg-[#D66A3E] w-1/2 rounded-full animate-[loading-bar_1.6s_infinite_ease-in-out]" />
          </div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes loading-bar {
            0% { left: -50%; }
            100% { left: 100%; }
          }
        `}} />
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] relative overflow-hidden bg-[#f9f3eb]">
      {import.meta.env.DEV && demoEnabled !== null && (
        <button
          onClick={toggleDemo}
          className="fixed bottom-4 left-4 z-[100] rounded-full px-3 py-1.5 text-xs font-medium shadow-md border transition-colors"
          style={{
            background: demoEnabled ? '#d66a3e' : 'rgba(255,255,255,0.85)',
            color: demoEnabled ? '#fff' : '#5a4c44',
            borderColor: demoEnabled ? '#d66a3e' : 'rgba(90,76,68,0.25)',
          }}
          title="Dev only: show or hide simulated people"
        >
          Demo {demoEnabled ? 'on' : 'off'}
        </button>
      )}
      <MainSpace
        thoughts={activeThoughts}
        selectedThoughtId={activeView === 'thoughtDetail' && selectedThought ? selectedThought.id : null}
        onInputClick={handleInputClick}
        onThoughtClick={handleThoughtClick}
        onReplyClick={handleReplyClick}
        onHistoryClick={() => setActiveView('history')}
        onThoughtMove={handleThoughtMove}
        aiGlowThoughtId={aiGlowThoughtId}
        voiceCount={voiceCount + demoOnline}
        panToTarget={panToTarget}
        onPanComplete={() => setPanToTarget(null)}
        tutorialStep={tutorialStep}
        setTutorialStep={setTutorialStep}
        onTriggerPanToStar={() => setPanToTarget({ x: 0, y: -80 })}
      />
      <ScreenGlow isPlaying={globalAiAudioPlaying} />
      <AnimatePresence>
        {showOnboarding && (
          <Onboarding
            key="onboarding"
            onComplete={() => {
              setShowOnboarding(false);
              setTutorialStep('hud');
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {activeView === 'compose' && (
          <ComposeModal
            key="compose"
            onClose={() => setActiveView('space')}
            onSubmit={handleSubmitThought}
          />
        )}
        {activeView === 'thoughtDetail' && selectedThought && (
          <ThoughtDetailModal
            key="detail"
            thought={selectedThought}
            allThoughts={activeThoughts}
            onClose={handleCloseModal}
            onAddResponse={(r) => handleAddResponse(selectedThought.id, r)}
            onOpenDraw={() => setShowDrawModal(true)}
            onDeleteThought={handleDeleteThought}
            onDeleteReply={handleDeleteReply}
            tutorialStep={tutorialStep}
          />
        )}
        {activeView === 'history' && (
          <HistoryModal
            key="history"
            thoughts={thoughts}
            userId={anonUserId}
            onClose={() => setActiveView('space')}
            onThoughtClick={handleHistoryThoughtClick}
          />
        )}
        {activeView === 'replyDetail' && selectedReply && selectedThought && (
          <ReplyDetailModal
            key="replyDetail"
            reply={selectedReply}
            parentThought={selectedThought}
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {tutorialStep === 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[#050308]/95 p-6 text-center"
          >
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(214,106,62,0.2) 0%, transparent 60%)' }}
            />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="max-w-[420px] bg-[rgba(255,255,255,0.03)] backdrop-blur-3xl border border-[rgba(255,255,255,0.15)] shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-[32px] p-8 flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-[rgba(214,106,62,0.15)] border border-[rgba(214,106,62,0.3)] flex items-center justify-center text-[#D66A3E] mb-6 shadow-[0_0_20px_rgba(214,106,62,0.2)]">
                <Sparkles size={32} />
              </div>
              <h2 className="text-[#f9f3eb] text-[26px] font-bold mb-3" style={{ fontFamily: "'Alegreya', serif" }}>
                Welcome to the Sky
              </h2>
              <p className="text-[#e2d9d1] text-[15px] leading-relaxed mb-8" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
                You are ready. The mock tutorial thought has faded away, and you are now connected to the live sky. Share your whispers, support others, and let the warmth guide you.
              </p>
              <motion.button
                onClick={() => {
                  setTutorialStep('none');
                  setSelectedThought(null);
                  setActiveView('space');
                  localStorage.setItem('hasCompletedOnboarding', 'true');
                }}
                className="w-full h-[52px] bg-[#D66A3E] text-[#fffcf9] rounded-[18px] text-[16px] font-bold shadow-[0_0_20px_rgba(214,106,62,0.4)] cursor-pointer"
                style={{ fontFamily: "'Alegreya Sans', sans-serif" }}
                whileHover={{ scale: 1.02, backgroundColor: '#bd5e37', boxShadow: '0 0 25px rgba(214,106,62,0.6)' }}
                whileTap={{ scale: 0.98 }}
              >
                Enter the Sanctuary
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDrawModal && (
          <DrawModal
            key="draw"
            onClose={() => setShowDrawModal(false)}
            onSend={handleSendDrawing}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {crisisHelpline && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <CrisisCard
              helpline={crisisHelpline}
              onClose={() => setCrisisHelpline(null)}
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%", scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 20, x: "-50%", scale: 0.95 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[110] w-[90%] max-w-[420px] bg-[rgba(20,15,25,0.9)] backdrop-blur-xl border border-[rgba(214,106,62,0.3)] rounded-[20px] px-5 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.6),_0_0_20px_rgba(214,106,62,0.1)] flex items-center justify-between gap-4 cursor-pointer hover:bg-[rgba(30,24,35,0.95)] hover:border-[rgba(214,106,62,0.5)] transition-all active:scale-[0.99]"
            onClick={() => handleToastClick(activeToast.thought)}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[rgba(214,106,62,0.15)] flex items-center justify-center text-[#D66A3E] border border-[rgba(214,106,62,0.3)] animate-pulse shrink-0">
                <Sparkles size={18} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] text-[#D66A3E] font-bold tracking-wider" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
                  NEW EMBER
                </span>
                <p className="text-[#f9f3eb] text-[14px] font-normal leading-normal truncate mt-0.5" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
                  {activeToast.thought.text}
                </p>
              </div>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setActiveToast(null);
              }}
              className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-[#8a7f79] hover:text-white transition-colors shrink-0"
            >
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
