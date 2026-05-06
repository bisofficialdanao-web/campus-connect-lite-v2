import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface ActivityPayload {
  userId: string;
  userName: string;
  userPhoto?: string;
  type: 'post' | 'comment' | 'reaction' | 'quiz_complete' | 'class_create';
  content: string;
  targetId?: string;
  targetName?: string;
  targetContent?: string;
}

export async function logActivity(payload: ActivityPayload) {
  try {
    await addDoc(collection(db, 'activities'), {
      ...payload,
      timestamp: serverTimestamp()
    });
  } catch (e) {
    console.error('Error logging activity:', e);
  }
}
