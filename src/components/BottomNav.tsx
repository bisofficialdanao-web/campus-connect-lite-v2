import React from 'react';
import { BookOpen, Users, MessageCircle, User } from 'lucide-react';
import { cn } from '../lib/utils';

export type PageView = 'library' | 'campus' | 'chats' | 'profile';

interface BottomNavProps {
  currentView: PageView;
  onViewChange: (view: PageView) => void;
}

export default function BottomNav({ currentView, onViewChange }: BottomNavProps) {
  const items = [
    { id: 'library', icon: BookOpen, label: 'Library' },
    { id: 'campus', icon: Users, label: 'Campus' },
    { id: 'chats', icon: MessageCircle, label: 'Chats' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-brand-surface border-t border-brand-border flex items-center justify-around px-4 z-50">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id as PageView)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-all",
            currentView === item.id 
              ? "text-brand-primary" 
              : "text-brand-secondary hover:text-brand-ink"
          )}
        >
          <item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          {currentView === item.id && (
            <div className="absolute top-0 w-8 h-1 bg-brand-primary rounded-b-full" />
          )}
        </button>
      ))}
    </nav>
  );
}
