import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';

interface UseRealtimeProps {
  onChatMessageReceived?: (msg: any) => void;
  onNotificationReceived?: (notification: any) => void;
}

export function useRealtime({ onChatMessageReceived, onNotificationReceived }: UseRealtimeProps = {}) {
  const { user, tenantId } = useAuthStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  // eventSourceRef.current is only ever read/written inside effects and event
  // handlers below; isConnected mirrors it into render-safe state.
  const [isConnected, setIsConnected] = useState(false);

  // Use refs to avoid reconnecting SSE on callback updates
  const chatCallbackRef = useRef(onChatMessageReceived);
  const notifCallbackRef = useRef(onNotificationReceived);

  useEffect(() => {
    chatCallbackRef.current = onChatMessageReceived;
    notifCallbackRef.current = onNotificationReceived;
  }, [onChatMessageReceived, onNotificationReceived]);

  useEffect(() => {
    if (!user || !tenantId) {
      // Note: no need to setIsConnected(false) here — if a connection was
      // previously open, this effect's own cleanup (below) already reset it
      // before this branch runs; on first mount it's already false by default.
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      useNotificationStore.getState().setConnected(false);
      return;
    }

    const sseUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7010/api/v1'}/notifications/stream`;

    // EventSource connection (HttpOnly cookies will be sent automatically)
    const es = new EventSource(sseUrl, { withCredentials: true });
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log('SSE connection successfully established.');
      setIsConnected(true);
      useNotificationStore.getState().setConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const notif = JSON.parse(event.data);
        if (notif.type === 'CHAT') {
          if (chatCallbackRef.current) {
            chatCallbackRef.current(notif);
          }
        } else {
          if (notifCallbackRef.current) {
            notifCallbackRef.current(notif);
          }
        }
      } catch (err) {
        console.error('Failed to parse SSE event data', err);
      }
    };

    es.onerror = (err) => {
      console.error('SSE connection error, attempting reconnect...', err);
      setIsConnected(false);
      useNotificationStore.getState().setConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      useNotificationStore.getState().setConnected(false);
    };
  }, [user, tenantId]);

  return {
    isConnected
  };
}

