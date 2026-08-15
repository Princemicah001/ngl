import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for Chrome/Browser Native PWA detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Check for updates
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
  });
}

// Ensure OpenGraph and Twitter images use absolute URLs for current origin if not already matching
if (typeof window !== 'undefined') {
  const origin = window.location.origin;
  const absFavicon = `${origin}/favicon.png`;
  
  const updateMeta = (selector: string, attr: string, value: string) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };

  // If running on a live origin that is different, synchronize metadata
  if (origin && !origin.includes('localhost')) {
    updateMeta('meta[property="og:image"]', 'content', absFavicon);
    updateMeta('meta[property="og:image:secure_url"]', 'content', absFavicon);
    updateMeta('meta[name="twitter:image"]', 'content', absFavicon);
    updateMeta('meta[name="twitter:image:src"]', 'content', absFavicon);
    updateMeta('meta[itemprop="image"]', 'content', absFavicon);
    updateMeta('link[rel="image_src"]', 'href', absFavicon);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
