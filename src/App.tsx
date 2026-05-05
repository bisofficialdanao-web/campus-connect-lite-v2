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
          <div className="w-24 h-24 bg-gradient-to-br from-green-600 to-yellow-500 rounded-[32px] flex items-center justify-center mb-8 shadow-2xl pulse-glow">
            <GraduationCap size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-black mb-3 tracking-tighter">CampusConnect Lite</h1>
          <p className="text-brand-secondary mb-10 font-medium leading-relaxed">
            A lightweight educational platform for structured classrooms and peer communication.
          </p>
          <button 
            onClick={signIn}
            className="w-full bg-brand-ink text-white font-bold py-4 rounded-2xl hover:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-lg"
          >
            <ShieldCheck size={20} />
            Continue with Google
          </button>
          <p className="mt-8 text-[11px] text-brand-secondary font-bold uppercase tracking-widest opacity-50">
            Optimized for 2G/3G/4G/5G
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg px-6">
        <div className="w-full max-w-sm text-center">
          <h2 className="text-2xl font-black mb-2 tracking-tight">Choose Your Role</h2>
          <p className="text-brand-secondary mb-10 font-medium">Select your primary activity on CampusConnect.</p>
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => updateRole('teacher')}
              className="group bg-brand-surface border-2 border-brand-border p-6 rounded-3xl text-left hover:border-brand-primary transition-all active:scale-[0.98]"
            >
              <div className="p-3 bg-brand-primary/10 rounded-2xl w-fit mb-4 group-hover:bg-brand-primary transition-colors">
                <GraduationCap className="text-brand-primary group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-black text-xl mb-1">Teacher</h3>
              <p className="text-sm text-brand-secondary font-medium">Manage classes, create quizzes, and moderate chats.</p>
            </button>
            <button 
              onClick={() => updateRole('student')}
              className="group bg-brand-surface border-2 border-brand-border p-6 rounded-3xl text-left hover:border-brand-primary transition-all active:scale-[0.98]"
            >
              <div className="p-3 bg-brand-primary/10 rounded-2xl w-fit mb-4 group-hover:bg-brand-primary transition-colors">
                <BookOpen className="text-brand-primary group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-black text-xl mb-1">Student</h3>
              <p className="text-sm text-brand-secondary font-medium">Join classes, access study guides, and communicate with peers.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'campus': return <Campus onViewChange={setCurrentView} />;
      case 'library': return <Library />;
      case 'classes': return <Classes onViewChange={setCurrentView} />;
      case 'chats': return <Chats />;
      case 'profile': return <Profile />;
      default: return <Campus onViewChange={setCurrentView} />;
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
