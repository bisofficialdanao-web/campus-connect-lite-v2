import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, ShieldCheck, Mail, LogOut, Edit3, Camera, Save, X, GraduationCap, BookOpen, AlertCircle, Upload, Loader2 } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { regulateImage } from '../lib/imageRegulator';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { db, storage } from '../lib/firebase';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function Profile() {
  const { profile, logout, auth } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    if (!profile) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPG, etc.)');
        return;
    }

    // Size check
    if (file.size > 5 * 1024 * 1024) {
        alert('File too large for the Free Tier. Please use a smaller file.');
        return;
    }

    setIsCompressing(true);
    try {
      const compressedBlob = await regulateImage(file);
      setIsCompressing(false);
      setIsUploading(true);

      // Use a fixed path so it overwrites the old one (Cleanup)
      const storageRef = ref(storage, `profiles/${profile.uid}/avatar`);
      
      const snapshot = await uploadBytes(storageRef, compressedBlob, { contentType: 'image/webp' });
      const downloadURL = await getDownloadURL(snapshot.ref);
      setPhotoURL(downloadURL);
      setIsUploading(false);
    } catch (error) {
      console.error("Upload error", error);
      alert('Image processing failed.');
      setIsCompressing(false);
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
      alert('Profile updated successful!');
      setIsEditing(false);
    } catch (error) {
      console.error("Profile update failed", error);
      handleFirestoreError(error, OperationType.WRITE, 'users', auth);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 pb-20">
      {/* Profile Card */}
      <div className="bg-brand-surface border border-brand-border/40 rounded-xl p-6 shadow-soft flex flex-col items-center">
        <div className="relative group mb-4">
          <div className="w-20 h-20 rounded-2xl bg-brand-bg border border-brand-border/30 flex items-center justify-center overflow-hidden shadow-inner group-hover:border-brand-primary/30 transition-all">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
            ) : (
              <User size={32} className="text-brand-secondary/40" />
            )}
          </div>
          {isEditing && (
            <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center pointer-events-none">
              <Camera className="text-white" size={20} />
            </div>
          )}
        </div>

        <h3 className="text-lg font-bold text-brand-ink tracking-tight mb-1">{profile?.displayName || 'Anonymous'}</h3>
        <div className="flex items-center gap-1.5 mb-6">
           <span className={cn(
             "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
             profile?.role === 'teacher' ? "bg-purple-50 text-purple-600 border border-purple-100" : "bg-blue-50 text-blue-600 border border-blue-100"
           )}>
             {profile?.role}
           </span>
           {profile?.isApproved && (
             <span className="bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
               Approved
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
            className="w-full bg-brand-bg text-brand-ink border border-brand-border/40 font-semibold h-[38px] rounded-lg flex items-center justify-center gap-2 hover:bg-white transition-all active:scale-95 text-[13px]"
          >
            <Edit3 size={16} />
            Edit Profile
          </button>
        ) : (
          <div className="w-full space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-brand-secondary/60 ml-1">Display Name</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-brand-secondary/60 ml-1">Profile Photo</label>
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
                  "w-full h-28 bg-brand-bg border border-dashed border-brand-border/40 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-primary/30 transition-all group overflow-hidden relative",
                  (isUploading || isCompressing) && "pointer-events-none opacity-50"
                )}
              >
                {isCompressing || isUploading ? (
                  <Loader2 className="animate-spin text-brand-primary" size={20} />
                ) : photoURL ? (
                  <>
                    <img src={photoURL} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white" size={20} />
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="text-brand-secondary/40" size={20} />
                    <span className="text-[11px] font-semibold text-brand-secondary/40 uppercase tracking-wider">Change Photo</span>
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
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleUpdateProfile}
                disabled={isSaving}
                className="flex-1 bg-brand-primary text-white font-semibold h-[38px] rounded-lg text-[13px] hover:brightness-110 transition-all disabled:opacity-50"
              >
                Save
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 border border-brand-border/40 rounded-lg h-[38px] hover:bg-brand-bg transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Sections */}
      <div className="grid grid-cols-1 gap-2">
        <div className="bg-brand-surface border border-brand-border/40 rounded-xl p-4 flex items-center justify-between shadow-soft">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-bg rounded-lg border border-brand-border/20 text-brand-secondary/40"><Mail size={16} /></div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-brand-secondary/40 tracking-wider">Email</p>
              <p className="font-medium text-sm">{profile?.email}</p>
            </div>
          </div>
        </div>

        <button 
          onClick={logout}
          className="bg-red-50/50 border border-red-100 p-4 rounded-xl flex items-center justify-between group hover:bg-red-50 transition-all active:scale-[0.99] shadow-soft"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100/50 rounded-lg text-red-600 transition-all"><LogOut size={16} /></div>
            <span className="font-semibold text-red-600 text-[13px] uppercase tracking-wider">Sign Out</span>
          </div>
        </button>
      </div>

      <div className="pt-4 text-center">
        <p className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.2em] opacity-30">CampusConnect Lite v1.0.0</p>
      </div>
    </div>
  );
}
