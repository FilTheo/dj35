'use client';

import { ReactNode } from 'react';

interface AppShellProps {
  header: ReactNode;
  calendar: ReactNode;
  sidebar: ReactNode;
  roster: ReactNode;
}

export default function AppShell({ header, calendar, sidebar, roster }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {header}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content area: calendar + roster */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-6">
            {calendar}
          </div>
          <div className="border-t border-gray-200 bg-white">
            {roster}
          </div>
        </div>
        {/* Right sidebar */}
        <div className="w-[420px] flex-shrink-0 border-l border-gray-200 bg-white overflow-auto">
          {sidebar}
        </div>
      </div>
    </div>
  );
}
