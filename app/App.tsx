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
import { api } from './api';
import fixtureThoughts from '../fixtures/thoughts.json';

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
  const [thoughts, setThoughts] = useState<Thought[]>(initialThoughts);
  const [activeView, setActiveView] = useState<ActiveView>('space');
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);
  const [selectedReply, setSelectedReply] = useState<ThoughtResponse | null>(null);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [aiGlowThoughtId, setAiGlowThoughtId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
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


  // Fetch thoughts — reads directly from the KV table to avoid edge function cold-start/EPIPE issues
  const fetchThoughts = useCallback(async () => {
    try {
      const response = await fetch(`${SERVER_URL}/thoughts`, {
        method: 'GET',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
      const data = await response.json();

      const list = data || [];
      const parsedData = list.map((t: any) => ({
        ...t,
        timestamp: new Date(t.timestamp),
        responses: (t.responses || []).map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp),
        })),
      }));

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
      console.warn('Live API unavailable or empty, populating initial fixture lanterns:', err);
      // Fallback to rich fixtures
      const parsedFixtures = (fixtureThoughts as any[]).map((t: any) => ({
        ...t,
        timestamp: new Date(t.timestamp),
        responses: (t.responses || []).map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp),
        })),
      }));
      setThoughts(prev => (prev.length > 0 ? prev : parsedFixtures));
    } finally {
      if (loadingRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchThoughts();

    // Polling fallback: re-fetch every 10s in case Realtime silently fails
    const pollInterval = setInterval(() => {
      fetchThoughts();
    }, 10000);

    // Subscribe to key-value store changes in Supabase
    const channel = supabase
      .channel('realtime-kv')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kv_store_9b55d09a' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as { key: string; value: any };
            if (row.key && row.key.startsWith('thought:')) {
              const thought = row.value;
              const formattedThought: Thought = {
                ...thought,
                timestamp: new Date(thought.timestamp),
                responses: (thought.responses || []).map((r: any) => ({
                  ...r,
                  timestamp: new Date(r.timestamp),
                })),
              };
              setThoughts((prev) => {
                const index = prev.findIndex((t) => t.id === formattedThought.id);
                if (index !== -1) {
                  const updated = [...prev];
                  updated[index] = formattedThought;
                  return updated;
                } else {
                  if (!loadingRef.current && formattedThought.authorId !== anonUserId) {
                    setActiveToast({
                      id: formattedThought.id,
                      thought: formattedThought,
                    });
                    
                    setTimeout(() => {
                      setActiveToast(current => current?.id === formattedThought.id ? null : current);
                    }, 8000);
                  }
                  return [...prev, formattedThought];
                }
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as { key: string };
            if (oldRow && oldRow.key && oldRow.key.startsWith('thought:')) {
              const id = oldRow.key.substring('thought:'.length);
              setThoughts((prev) => prev.filter((t) => t.id !== id));
            }
          }
        }
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

      const response = await fetch(`${SERVER_URL}/thoughts/${thoughtId}`, {
        method: 'DELETE',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      if (!response.ok) throw new Error(`Delete error: ${response.status}`);
    } catch (err) {
      console.error("Error deleting thought:", err);
      fetchThoughts();
    }
  }, [fetchThoughts]);

  const handleDeleteReply = useCallback(async (thoughtId: string, replyId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this reply?");
    if (!confirmDelete) return;

    try {
      let updatedThought: Thought | null = null;
      setThoughts(prev => prev.map(t => {
        if (t.id === thoughtId) {
          const filteredResponses = t.responses.filter(r => r.id !== replyId);
          updatedThought = { ...t, responses: filteredResponses };
          return updatedThought;
        }
        return t;
      }));

      setSelectedThought(prev => {
        if (prev && prev.id === thoughtId) {
          return { ...prev, responses: prev.responses.filter(r => r.id !== replyId) };
        }
        return prev;
      });

      if (updatedThought) {
        const response = await fetch(`${SERVER_URL}/thoughts`, {
          method: 'POST',
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedThought)
        });
        if (!response.ok) throw new Error(`Update error: ${response.status}`);
      }
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
    
    const newThought: Thought = {
      id: Date.now().toString(),
      text,
      timestamp: new Date(),
      rotation: getRandomOffset(10),
      x: base.x + getRandomOffset(200),
      y: base.y + getRandomOffset(200),
      variant: (['warm', 'light', 'teal', 'rose'] as const)[Math.floor(Math.random() * 4)],
      width: 280 + Math.floor(Math.random() * 60),
      responses: [],
      aiResponded: false,
      authorId: anonUserId,
      emotion,
    };

    setThoughts(prev => [...prev, newThought]);
    setActiveView('space');

    // Save directly to KV table — consistent with how we read
    try {
      const response = await fetch(`${SERVER_URL}/thoughts`, {
        method: 'POST',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newThought)
      });
      if (!response.ok) throw new Error(`Save error: ${response.status}`);
    } catch (err) {
      console.error('Error saving thought:', err);
    }

    // AI fallback after 10s if no human responses
    setTimeout(async () => {
      setThoughts(prev => {
        const currentThought = prev.find(th => th.id === newThought.id);
        
        // Only trigger AI response if there is at most 1 user online (only the author is online)
        const shouldTriggerAI = currentThought && 
                                currentThought.responses.length === 0 && 
                                !currentThought.aiResponded && 
                                voiceCountRef.current <= 1;
        
        if (shouldTriggerAI) {
          console.log('Triggering AI response flow for thought:', newThought.id);
          setAiGlowThoughtId(newThought.id);
          
          // Trigger AI Generation and voice synthesis
          (async () => {
            try {
              // 1. Generate support response text (Gemini API via server function)
              const aiResponseRaw = await fetch(`${SERVER_URL}/generate-support`, {
                method: 'POST',
                headers: {
                  'apikey': publicAnonKey,
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ thoughtText: text, emotion })
              });
              if (!aiResponseRaw.ok) throw new Error(`Gemini error: ${aiResponseRaw.status}`);
              const aiData = await aiResponseRaw.json();
              const message = aiData?.response || "I'm holding space for you.";

              // 2. Synthesize TTS voice (ElevenLabs API via server function)
              let audioUrl = "";
              try {
                const ttsResponseRaw = await fetch(`${SERVER_URL}/text-to-speech`, {
                  method: 'POST',
                  headers: {
                    'apikey': publicAnonKey,
                    'Authorization': `Bearer ${publicAnonKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ text: message })
                });
                if (ttsResponseRaw.ok) {
                  const ttsData = await ttsResponseRaw.json();
                  audioUrl = ttsData?.url || "";
                }
              } catch (ttsErr) {
                console.error('TTS synthesis error:', ttsErr);
              }

              // 3. Play generated voice audio on the website
              if (audioUrl) {
                const audio = new Audio(audioUrl);
                audio.onended = () => setGlobalAiAudioPlaying(false);
                audio.play()
                  .then(() => setGlobalAiAudioPlaying(true))
                  .catch(e => {
                    console.error("Audio playback error:", e);
                    setGlobalAiAudioPlaying(false);
                  });
              }

              const aiResponse: ThoughtResponse = {
                id: 'ai-' + Date.now(),
                type: 'voice',
                content: message, // Save text transcript
                timestamp: new Date(),
                isAI: true,
                audioUrl: audioUrl || undefined,
              };

              setThoughts(prev2 => prev2.map(th => {
                if (th.id === newThought.id) {
                  const updated = {
                    ...th,
                    aiResponded: true,
                    glowing: false,
                    responses: [...th.responses, aiResponse],
                  };
                  // Sync updated state to KV table
                  fetch(`${SERVER_URL}/thoughts`, {
                    method: 'POST',
                    headers: {
                      'apikey': publicAnonKey,
                      'Authorization': `Bearer ${publicAnonKey}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updated)
                  }).then(res => { if (!res.ok) console.error('Error syncing AI response:', res.statusText); });
                  return updated;
                }
                return th;
              }));
            } catch (err) {
              console.error('AI Flow Error:', err);
            } finally {
              setAiGlowThoughtId(null);
            }
          })();
        }
        return prev;
      });
    }, 10000);
  }, []);

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
      setTutorialReplies(prev => [...prev, newResponse]);
      setTimeout(() => {
        setTutorialStep('complete');
      }, 1500);
      return;
    }

    setThoughts(prev => {
      const updatedThoughts = prev.map(t => {
        if (t.id === thoughtId) {
          const updated = { ...t, responses: [...t.responses, newResponse] };
          // Sync to KV table
          fetch(`${SERVER_URL}/thoughts`, {
            method: 'POST',
            headers: {
              'apikey': publicAnonKey,
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updated)
          }).then(res => { if (!res.ok) console.error('Error syncing response:', res.statusText); });
          return updated;
        }
        return t;
      });
      
      const updatedSelected = updatedThoughts.find(t => t.id === thoughtId);
      if (updatedSelected) setSelectedThought(updatedSelected);
      
      return updatedThoughts;
    });
  }, []);

  const handleThoughtMove = useCallback((id: string, x: number, y: number) => {
    setThoughts(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { ...t, x, y };
        // Sync position to KV table
        fetch(`${SERVER_URL}/thoughts`, {
          method: 'POST',
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updated)
        }).then(res => { if (!res.ok) console.error('Error syncing position:', res.statusText); });
        return updated;
      }
      return t;
    }));
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
      text: "I'm glad you drifted here. Tap on this star to see how we respond to each other.",
      timestamp: new Date(),
      rotation: -2,
      x: 0,
      y: -80,
      variant: 'warm',
      responses: tutorialReplies,
      aiResponded: false,
      width: 280,
      authorId: 'system',
      emotion: 'grateful'
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
      <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-[#050308] gap-6">
        <div className="relative flex items-center justify-center">
          {/* Gentle pulse aura behind the logo */}
          <div className="absolute w-24 h-24 bg-[#D66A3E]/15 rounded-full blur-xl animate-pulse" />
          <img 
            src="https://i.imgur.com/5nagvWz.png" 
            alt="Ember Logo" 
            className="h-24 w-auto object-contain relative z-10"
          />
        </div>
        <div className="w-20 h-[2px] bg-white/10 rounded-full overflow-hidden relative">
          <div className="absolute top-0 left-0 h-full bg-[#D66A3E] w-1/2 rounded-full animate-[loading-bar_1.5s_infinite_ease-in-out]" />
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
      <MainSpace
        thoughts={activeThoughts}
        onInputClick={handleInputClick}
        onThoughtClick={handleThoughtClick}
        onReplyClick={handleReplyClick}
        onHistoryClick={() => setActiveView('history')}
        onThoughtMove={handleThoughtMove}
        aiGlowThoughtId={aiGlowThoughtId}
        voiceCount={voiceCount}
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
