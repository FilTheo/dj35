'use client';

import { ReactNode, useState } from 'react';

interface AppShellProps {
  header: ReactNode;
  calendar: ReactNode;
  sidebar: ReactNode;
  roster: ReactNode;
}

export default function AppShell({ header, calendar, sidebar, roster }: AppShellProps) {
  const [mobilePanel, setMobilePanel] = useState<'calendar' | 'sidebar'>('calendar');

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {header}
      {/* Mobile toggle bar */}
      <div className="flex lg:hidden border-b border-gray-200 bg-white">
        <button
          onClick={() => setMobilePanel('calendar')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            mobilePanel === 'calendar'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📅 Calendar
        </button>
        <button
          onClick={() => setMobilePanel('sidebar')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            mobilePanel === 'sidebar'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          💬 Chat
        </button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* Main content area: calendar + roster - hidden on mobile when sidebar is shown */}
        <div className={`flex flex-1 flex-col overflow-hidden ${mobilePanel === 'sidebar' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex-1 overflow-auto p-6">
            {calendar}
          </div>
          <div className="border-t border-gray-200 bg-white">
            {roster}
          </div>
        </div>
        {/* Right sidebar - hidden on mobile unless sidebar panel is active */}
        <div className={`${mobilePanel === 'calendar' ? 'hidden' : ''} lg:block lg:w-[420px] flex-shrink-0 border-l border-gray-200 bg-white overflow-auto`}>
          {sidebar}
        </div>
      </div>
    </div>
  );
}
