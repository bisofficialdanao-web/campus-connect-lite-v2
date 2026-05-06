import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { PageView } from './components/BottomNav';
import Campus from './pages/Campus';
import Classes from './pages/Classes';
import Chats from './pages/Chats';
import Profile from './pages/Profile';
import Library from './pages/Library';
import { GraduationCap, BookOpen, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';

// CampusConnect Lite - Rebuild Trigger
function AppContent() {
  const { user, profile, loading, signIn, updateRole, activeDM } = useAuth();
  const [currentView, setCurrentView] = useState<PageView>('campus');
  const [targetProfileUid, setTargetProfileUid] = useState<string | null>(null);

  useEffect(() => {
    if (activeDM) {
      setCurrentView('chats');
    }
  }, [activeDM]);
  const [selectingRole, setSelectingRole] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-brand-secondary uppercase tracking-widest">Connect Lite</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg px-6">
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-brand-primary/5 rounded-2xl flex items-center justify-center mb-6 shadow-soft">
            <GraduationCap size={40} className="text-brand-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2 tracking-tight">CampusConnect</h1>
          <p className="text-[14px] text-brand-secondary mb-8 font-medium leading-relaxed">
            Lightweight educational platform for structured classrooms and digital library.
          </p>
          <button 
            onClick={signIn}
            className="w-full bg-brand-ink text-white font-semibold h-[48px] rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-soft active:scale-[0.98]"
          >
            <ShieldCheck size={20} />
            <span className="text-sm">Continue with Google</span>
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg px-6">
        <div className="w-full max-w-sm text-center">
          <h2 className="text-xl font-bold mb-1 tracking-tight">Access Mode</h2>
          <p className="text-[14px] text-brand-secondary mb-8 font-medium text-balance">Select your primary usage role.</p>
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={() => updateRole('teacher')}
              className="group bg-brand-surface border border-brand-border/40 p-5 rounded-xl text-left hover:border-brand-primary/30 transition-all active:scale-[0.99] shadow-soft"
            >
              <div className="p-2.5 bg-brand-primary/5 rounded-lg w-fit mb-3 group-hover:bg-brand-primary transition-colors">
                <GraduationCap className="text-brand-primary group-hover:text-white transition-colors" size={20} />
              </div>
              <h3 className="font-bold text-lg mb-0.5">Teacher</h3>
              <p className="text-[13px] text-brand-secondary/70 font-medium">Manage classes, library and groups.</p>
            </button>
            <button 
              onClick={() => updateRole('student')}
              className="group bg-brand-surface border border-brand-border/40 p-5 rounded-xl text-left hover:border-brand-primary/30 transition-all active:scale-[0.99] shadow-soft"
            >
              <div className="p-2.5 bg-brand-primary/5 rounded-lg w-fit mb-3 group-hover:bg-brand-primary transition-colors">
                <BookOpen className="text-brand-primary group-hover:text-white transition-colors" size={20} />
              </div>
              <h3 className="font-bold text-lg mb-0.5">Student</h3>
              <p className="text-[13px] text-brand-secondary/70 font-medium">Join classes and peer-to-peer chats.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'campus': return (
        <Campus 
          onViewChange={setCurrentView} 
          onViewUser={(uid) => {
            setTargetProfileUid(uid);
            setCurrentView('profile');
          }}
        />
      );
      case 'library': return <Library />;
      case 'classes': return (
        <Classes 
          onViewChange={setCurrentView} 
          onViewUser={(uid) => {
            setTargetProfileUid(uid);
            setCurrentView('profile');
          }}
        />
      );
      case 'chats': return <Chats />;
      case 'profile': return (
        <Profile 
          targetUid={targetProfileUid} 
          onViewUser={(uid) => {
            setTargetProfileUid(uid);
            setCurrentView('profile');
          }}
          onBackToMe={() => setTargetProfileUid(null)}
        />
      );
      default: return (
        <Campus 
          onViewChange={setCurrentView} 
          onViewUser={(uid) => {
            setTargetProfileUid(uid);
            setCurrentView('profile');
          }}
        />
      );
    }
  };

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
