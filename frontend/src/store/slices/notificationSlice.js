// frontend/src/store/slices/notificationSlice.js - COMPLETE FIXED VERSION
import { createSlice } from '@reduxjs/toolkit';

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    notifications: [],
    unreadCount: 0,
  },
  reducers: {
    addNotification: (state, action) => {
      if (!action.payload) {
        console.warn('⚠️ No payload provided to addNotification');
        return;
      }
      
      console.log('📬 Adding notification to Redux state:', action.payload);
      
      const notification = {
        ...action.payload,
        id: action.payload.id || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        read: false,
        timestamp: action.payload.timestamp || new Date().toISOString(),
      };
      
      // ✅ Check for duplicates before adding
      const isDuplicate = state.notifications.some(n => n.id === notification.id);
      if (isDuplicate) {
        console.log('⚠️ Duplicate notification ignored:', notification.id);
        return;
      }
      
      state.notifications.unshift(notification);
      state.unreadCount = state.notifications.filter(n => !n.read).length;
      
      console.log('✅ Notification added. Total:', state.notifications.length, 'Unread:', state.unreadCount);
    },
    
    removeNotification: (state, action) => {
      console.log('🗑️ Removing notification:', action.payload);
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
      state.unreadCount = state.notifications.filter(n => !n.read).length;
    },
    
    clearNotifications: (state) => {
      console.log('🧹 Clearing all notifications');
      state.notifications = [];
      state.unreadCount = 0;
    },
    
    markAllAsRead: (state) => {
      console.log('📖 Marking all notifications as read');
      state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
      state.unreadCount = 0;
    },
    
    markAsRead: (state, action) => {
      console.log('📖 Marking notification as read:', action.payload);
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification) {
        notification.read = true;
        state.unreadCount = state.notifications.filter(n => !n.read).length;
        console.log('✅ Notification marked as read. Unread count:', state.unreadCount);
      }
    },
    
    setNotifications: (state, action) => {
      if (!Array.isArray(action.payload)) {
        console.warn('⚠️ setNotifications received non-array:', action.payload);
        state.notifications = [];
        state.unreadCount = 0;
        return;
      }
      
      console.log('📋 Setting notifications:', action.payload.length);
      state.notifications = action.payload;
      
      // ✅ Calculate unread count from loaded notifications
      state.unreadCount = action.payload.filter(n => !n.read).length;
      console.log('✅ Notifications loaded. Total:', state.notifications.length, 'Unread:', state.unreadCount);
    },
    
    removeToast: (state, action) => {
      // ✅ Don't remove from notifications array, just hide the toast
      // Notifications should stay in the bell icon dropdown
      console.log('🔕 Hiding toast (notification stays in dropdown):', action.payload);
      // We don't actually remove anything here - just used for UI toast dismissal
    },
    
    updateUnreadCount: (state) => {
      const oldCount = state.unreadCount;
      state.unreadCount = state.notifications.filter(n => !n.read).length;
      console.log('🔄 Unread count updated:', oldCount, '→', state.unreadCount);
    },
  },
});

export const {
  addNotification,
  removeNotification,
  clearNotifications,
  markAllAsRead,
  markAsRead,
  setNotifications,
  removeToast,
  updateUnreadCount,
} = notificationSlice.actions;

export default notificationSlice.reducer;