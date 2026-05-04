import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { AppNotification } from '../types';

export const createNotification = async (notification: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...notification,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      isRead: true,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

export const markAllNotificationsAsRead = async (notifications: AppNotification[]) => {
  const unread = notifications.filter(n => !n.isRead);
  for (const n of unread) {
    await markNotificationAsRead(n.id);
  }
};
