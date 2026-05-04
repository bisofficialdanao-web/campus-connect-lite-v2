import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, ShieldCheck, Mail, LogOut, Edit3, Camera, Save, X, GraduationCap, BookOpen, AlertCircle, Upload, Loader2 } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function Profile() {
  const { profile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    if (!profile) return;
    
    // Validate file type and size
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPG, etc.)');
        return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('File size must be less than 2MB');
        return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${profile.uid}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          // Progress can be handled here if needed
        }, 
        (error) => {
          console.error("Upload failed", error);
          setIsUploading(false);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setPhotoURL(downloadURL);
          setIsUploading(false);
        }
      );
    } catch (error) {
      console.error("Upload error", error);
      setIsUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const profileRef = doc(db, 'users', profile.uid);
      await updateDoc(profileRef, {
        displayName,
        photoURL,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Profile update failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Profile Card */}
      <div className="bg-brand-surface border-2 border-brand-border rounded-[40px] p-8 shadow-sm flex flex-col items-center">
        <div className="relative group mb-6">
          <div className="w-24 h-24 rounded-[32px] bg-brand-bg border-2 border-brand-border flex items-center justify-center overflow-hidden shadow-inner group-hover:border-brand-primary transition-all">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
            ) : (
              <User size={40} className="text-brand-secondary" />
            )}
          </div>
          {isEditing && (
            <div className="absolute inset-0 bg-black/40 rounded-[32px] flex items-center justify-center pointer-events-none">
              <Camera className="text-white" size={24} />
            </div>
          )}
        </div>

        <h3 className="text-2xl font-black text-brand-ink tracking-tight mb-1">{profile?.displayName || 'Anonymous'}</h3>
        <div className="flex items-center gap-2 mb-8">
           <span className={cn(
             "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
             profile?.role === 'teacher' ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
           )}>
             {profile?.role === 'teacher' ? <GraduationCap size={12} /> : <BookOpen size={12} />}
             {profile?.role}
           </span>
           {profile?.isApproved ? (
             <span className="bg-green-100 text-green-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
               <ShieldCheck size={12} />
               Approved
             </span>
           ) : (
             <span className="bg-orange-100 text-orange-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
               <AlertCircle size={12} />
               Pending
             </span>
           )}
        </div>

        {!isEditing ? (
          <button 
            onClick={() => {
              setDisplayName(profile?.displayName || '');
              setPhotoURL(profile?.photoURL || '');
              setIsEditing(true);
            }}
            className="w-full bg-brand-bg text-brand-ink border border-brand-border font-bold py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-white transition-all active:scale-95"
          >
            <Edit3 size={18} />
            Edit Profile
          </button>
        ) : (
          <div className="w-full space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-brand-secondary ml-1">Display Name</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-brand-secondary ml-1">Profile Picture</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) await uploadFile(file);
                }}
                className={cn(
                  "w-full h-32 bg-brand-bg border-2 border-dashed border-brand-border rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-primary transition-all group overflow-hidden relative",
                  isUploading && "pointer-events-none opacity-50"
                )}
              >
                {isUploading ? (
                  <Loader2 className="animate-spin text-brand-primary" size={24} />
                ) : photoURL ? (
                  <>
                    <img src={photoURL} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-brand-ink/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white" size={24} />
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="text-brand-secondary group-hover:text-brand-primary transition-colors" size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-secondary">Click or drag to upload</span>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>
              <p className="text-[9px] text-brand-secondary/60 italic px-1">Max 2MB. PNG, JPG or WebP.</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleUpdateProfile}
                disabled={isSaving}
                className="flex-1 bg-brand-primary text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Save size={18} />
                Save
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 border border-brand-border rounded-xl hover:bg-brand-bg transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Sections */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-brand-surface border-2 border-brand-border rounded-3xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-bg rounded-xl"><Mail className="text-brand-secondary" size={18} /></div>
            <div>
              <p className="text-[10px] font-black uppercase text-brand-secondary tracking-widest">Email Address</p>
              <p className="font-bold text-sm">{profile?.email}</p>
            </div>
          </div>
        </div>

        <button 
          onClick={logout}
          className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl flex items-center justify-between group hover:bg-red-100 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl group-hover:bg-red-200 transition-all"><LogOut className="text-red-600" size={18} /></div>
            <span className="font-black text-red-600 text-sm uppercase tracking-widest">Sign Out</span>
          </div>
        </button>
      </div>

      <div className="pt-4 text-center">
        <p className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.2em] opacity-30">CampusConnect Lite v1.0.0</p>
      </div>
    </div>
  );
}
