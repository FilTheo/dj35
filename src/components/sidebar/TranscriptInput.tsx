'use client';

import { useState, useEffect } from 'react';

interface TranscriptInputProps {
  onProcess: (availabilityChat: string, userConstraints: string) => void;
  isProcessing: boolean;
  defaultConstraints?: string;
}

export default function TranscriptInput({ onProcess, isProcessing, defaultConstraints }: TranscriptInputProps) {
  const [availabilityChat, setAvailabilityChat] = useState('');
  const [userConstraints, setUserConstraints] = useState(defaultConstraints ?? '');

  // Update constraints when defaultConstraints changes (e.g. month navigation)
  useEffect(() => {
    setUserConstraints(defaultConstraints ?? '');
  }, [defaultConstraints]);

  const handleSubmit = () => {
    if (!availabilityChat.trim()) return;
    onProcess(availabilityChat.trim(), userConstraints.trim());
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Scheduling Constraints
          <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          value={userConstraints}
          onChange={(e) => setUserConstraints(e.target.value)}
          placeholder={"e.g. Alex is priority this month, he didn't play last month.\nExtra DJ Fil available on Fridays.\nKosmas must play on the 21st."}
          className="h-32 w-full resize-none rounded-lg border border-gray-300 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          Add priority DJs, date pinning, extra DJs, or any other scheduling rules.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          This Month&apos;s Availability Chat
          <span className="ml-1 text-xs font-normal text-red-400">*</span>
        </label>
        <textarea
          value={availabilityChat}
          onChange={(e) => setAvailabilityChat(e.target.value)}
          placeholder="Paste the Messenger group chat with DJ availability messages..."
          className="h-48 w-full resize-none rounded-lg border border-gray-300 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!availabilityChat.trim() || isProcessing}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </span>
        ) : (
          'Process Availability'
        )}
      </button>
    </div>
  );
}
