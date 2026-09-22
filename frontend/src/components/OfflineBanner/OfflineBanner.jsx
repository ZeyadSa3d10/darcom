import { useEffect, useState } from 'react';
import './OfflineBanner.css';

export default function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;
  return (
    <div className="offline-banner" role="alert">
      <i className="bi bi-wifi-off me-1"></i>
      You are offline. Some content may be unavailable.
    </div>
  );
}
