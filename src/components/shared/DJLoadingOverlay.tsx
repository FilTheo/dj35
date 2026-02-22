'use client';

import { useState, useEffect } from 'react';
import type { ResolutionPhase } from '@/lib/types';

const DJ_MESSAGES = [
  'Mixing the perfect schedule...',
  'Dropping beats into time slots...',
  'Finding the groove...',
  'Crossfading between DJs...',
  'Spinning up the algorithm...',
  'Reading the room...',
  'Warming up the decks...',
  'No requests, please...',
  'Cueing the next track...',
  'The AI DJ is in the booth...',
  'Balancing the lineup...',
  'Adjusting the EQ...',
  'Building the setlist...',
  'Making sure nobody plays back-to-back...',
  'Checking the BPM...',
];

const VERIFY_MESSAGES = [
  'Soundcheck in progress...',
  'Double-checking the lineup...',
  'Making sure every slot hits right...',
  'Quality control on the decks...',
];

const LOADING_PHASES: ResolutionPhase[] = ['optimizing', 'reoptimizing', 'verifying'];

export default function DJLoadingOverlay({ phase }: { phase: ResolutionPhase }) {
  const isLoadingPhase = LOADING_PHASES.includes(phase);
  const [visible, setVisible] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  // Show/hide with fade timing
  useEffect(() => {
    if (isLoadingPhase) {
      setVisible(true);
      setMsgIndex(0);
    } else if (visible) {
      const t = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(t);
    }
  }, [isLoadingPhase]);

  // Cycle messages
  const messages = phase === 'verifying' ? VERIFY_MESSAGES : DJ_MESSAGES;
  useEffect(() => {
    if (!isLoadingPhase) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoadingPhase, messages.length]);

  if (!visible) return null;

  const isVerifying = phase === 'verifying';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-400 ${
        isLoadingPhase ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex flex-col items-center gap-8">
        {/* Vinyl + Tonearm */}
        <div className="relative">
          {/* Vinyl Record */}
          <div
            className="relative h-40 w-40 rounded-full bg-gray-900 shadow-2xl"
            style={{
              animation: 'vinyl-spin 3s linear infinite',
              boxShadow:
                'inset 0 0 0 4px #222, inset 0 0 0 20px #1a1a1a, inset 0 0 0 22px #333, inset 0 0 0 36px #1a1a1a, inset 0 0 0 38px #2a2a2a, inset 0 0 0 52px #1a1a1a, inset 0 0 0 54px #333, 0 0 40px rgba(0,0,0,0.5)',
            }}
          >
            {/* Center Label */}
            <div className="absolute inset-0 m-auto h-14 w-14 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-teal-400 shadow-inner">
              {/* Center Hole */}
              <div className="absolute inset-0 m-auto h-3 w-3 rounded-full bg-gray-900" />
            </div>
            {/* Shine reflection */}
            <div
              className="absolute inset-0 rounded-full opacity-10"
              style={{
                background: 'linear-gradient(135deg, white 0%, transparent 40%, transparent 60%, white 100%)',
              }}
            />
          </div>

          {/* Tonearm */}
          <div
            className="absolute -top-3 -right-6"
            style={{
              animation: 'tonearm-bob 2s ease-in-out infinite',
              transformOrigin: '8px 8px',
            }}
          >
            {/* Pivot */}
            <div className="h-4 w-4 rounded-full bg-gray-400 shadow-md" />
            {/* Arm */}
            <div
              className="absolute left-1.5 top-3 w-1 rounded-full bg-gradient-to-b from-gray-400 to-gray-500"
              style={{ height: '72px' }}
            />
            {/* Headshell */}
            <div className="absolute left-0.5 top-[84px] h-3 w-3 rounded-sm bg-gray-300 shadow-sm" />
            {/* Stylus */}
            <div className="absolute left-1.5 top-[96px] h-2 w-0.5 bg-gray-500" />
          </div>
        </div>

        {/* Phase indicator */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <div
              className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                isVerifying ? 'bg-green-400' : 'bg-blue-400 animate-pulse'
              }`}
            />
            <span className={`transition-colors duration-300 ${isVerifying ? 'text-green-400' : 'text-blue-400'}`}>
              Optimizing
            </span>
          </div>
          <div className="flex gap-0.5">
            <div className={`h-px w-2 ${isVerifying ? 'bg-green-400/60' : 'bg-white/20'}`} />
            <div className={`h-px w-2 ${isVerifying ? 'bg-green-400/40' : 'bg-white/20'}`} />
            <div className={`h-px w-2 ${isVerifying ? 'bg-blue-400/60' : 'bg-white/20'}`} />
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                isVerifying ? 'bg-blue-400 animate-pulse' : 'bg-white/20'
              }`}
            />
            <span className={`transition-colors duration-300 ${isVerifying ? 'text-blue-400' : 'text-white/30'}`}>
              Verifying
            </span>
          </div>
        </div>

        {/* Rotating message */}
        <p
          key={msgIndex}
          className="text-lg font-medium text-white"
          style={{ animation: 'fade-in-up 0.4s ease-out' }}
        >
          {messages[msgIndex % messages.length]}
        </p>

        <p className="text-xs text-white/40">This usually takes a few seconds</p>
      </div>
    </div>
  );
}
