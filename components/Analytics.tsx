import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const Analytics: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // Inject Microsoft Clarity
    const clarityId = (import.meta as any).env.VITE_CLARITY_PROJECT_ID;
    if (clarityId && !window.clarityLoaded) {
      window.clarityLoaded = true;
      (function(c: any,l: any,a: any,r: any,i: any,t?: any,y?: any){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];if(y)y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", clarityId);
    }

    // Inject Google Analytics 4
    const gaId = (import.meta as any).env.VITE_GA_MEASUREMENT_ID;
    if (gaId && !window.gaLoaded) {
      window.gaLoaded = true;
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script1);

      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}', { page_path: window.location.pathname });
      `;
      document.head.appendChild(script2);
    }
  }, []);

  // Track page views on route change
  useEffect(() => {
    const gaId = (import.meta as any).env.VITE_GA_MEASUREMENT_ID;
    if (gaId && typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  return null;
};

// Add types for window
declare global {
  interface Window {
    clarityLoaded?: boolean;
    gaLoaded?: boolean;
    gtag?: (...args: any[]) => void;
  }
}
