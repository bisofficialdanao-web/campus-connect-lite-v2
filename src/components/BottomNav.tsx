import React from 'react';
import { BookOpen, Users, MessageCircle, User, GraduationCap } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export type PageView = 'library' | 'campus' | 'chats' | 'profile' | 'classes';

interface BottomNavProps {
  currentView: PageView;
  onViewChange: (view: PageView) => void;
}

export default function BottomNav({ currentView, onViewChange }: BottomNavProps) {
  const items = [
    { id: 'library', icon: BookOpen, label: 'Library' },
    { id: 'campus', icon: Users, label: 'Campus' },
    { id: 'classes', icon: GraduationCap, label: 'Classes' },
    { id: 'chats', icon: MessageCircle, label: 'Chats' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-14 bg-brand-surface/80 backdrop-blur-md border-t border-brand-border/50 flex items-center justify-around px-2 z-50">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id as PageView)}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 transition-all relative flex-1 h-full active:scale-90",
            currentView === item.id 
              ? "text-brand-primary" 
              : "text-brand-secondary"
          )}
        >
          <item.icon size={20} strokeWidth={currentView === item.id ? 2 : 1.5} />
          <span className="text-[8px] font-black uppercase tracking-[0.1em]">{item.label}</span>
          {currentView === item.id && (
            <motion.div 
              layoutId="navTab"
              className="absolute top-0 w-8 h-0.5 bg-brand-primary rounded-b-full" 
            />
          )}
        </button>
      ))}
    </nav>
  );
}
