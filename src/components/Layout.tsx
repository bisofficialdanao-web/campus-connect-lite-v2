import React from 'react';
import Header from './Header';
import BottomNav, { PageView } from './BottomNav';

interface LayoutProps {
  children: React.ReactNode;
  currentView: PageView;
  onViewChange: (view: PageView) => void;
}

export default function Layout({ children, currentView, onViewChange }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-brand-bg select-none">
      <Header />
      <main className="flex-1 pt-14 pb-16 overflow-y-auto no-scrollbar">
        <div className="max-w-2xl mx-auto w-full px-4 py-6">
          {children}
        </div>
      </main>
      <BottomNav currentView={currentView} onViewChange={onViewChange} />
    </div>
  );
}
