import { useCallback, useEffect, useState } from 'react';
import { pushApi } from '../services/api';

/**
 * Web Push: inscrição/cancelamento no service worker + backend.
 * Fica indisponível (available=false) se o navegador não suportar ou se o
 * backend não tiver chaves VAPID configuradas — a UI então esconde o toggle.
 */

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

const supported = typeof window !== 'undefined'
  && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export function usePush() {
  const [available, setAvailable] = useState(false); // suportado + habilitado no backend
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [publicKey, setPublicKey] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supported) return;
      try {
        const { data } = await pushApi.publicKey();
        if (!alive) return;
        setAvailable(!!data.enabled && !!data.publicKey);
        setPublicKey(data.publicKey);
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (alive) setSubscribed(!!sub);
      } catch {
        if (alive) setAvailable(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported || !publicKey) return false;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      await pushApi.subscribe({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
      });
      setSubscribed(true);
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, [publicKey]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await pushApi.unsubscribe(sub.endpoint).catch(() => {});
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, []);

  return { available, subscribed, busy, subscribe, unsubscribe };
}
