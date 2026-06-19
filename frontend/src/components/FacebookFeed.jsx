import { useEffect, useRef, useState } from 'react';
import './FacebookFeed.css';

const FB_PAGE_URL = 'https://www.facebook.com/DiredawaProsperityparty';
const SDK_ID = 'facebook-jssdk';

function loadFbSdk() {
  return new Promise((resolve, reject) => {
    // If already loaded
    if (window.FB && window.FB.XFBML) {
      resolve(window.FB);
      return;
    }

    // Facebook requires a div with id 'fb-root' to function correctly
    if (!document.getElementById('fb-root')) {
      const fbRoot = document.createElement('div');
      fbRoot.id = 'fb-root';
      document.body.appendChild(fbRoot);
    }

    // If script is already in document but not yet loaded
    const existingScript = document.getElementById(SDK_ID);
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (window.FB && window.FB.XFBML) {
          clearInterval(checkInterval);
          resolve(window.FB);
        }
      }, 100);
      return;
    }

    // Inject script
    const script = document.createElement('script');
    script.id = SDK_ID;
    script.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      const checkInterval = setInterval(() => {
        if (window.FB && window.FB.XFBML) {
          clearInterval(checkInterval);
          resolve(window.FB);
        }
      }, 100);
    };

    script.onerror = () => {
      reject(new Error('Facebook SDK failed to load'));
    };

    document.body.appendChild(script);
  });
}

export default function FacebookFeed() {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading'); // 'loading', 'ready', 'error'

  useEffect(() => {
    let isMounted = true;

    loadFbSdk()
      .then(() => {
        if (!isMounted) return;
        setStatus('ready');
        
        // Parse the specific container
        if (window.FB && window.FB.XFBML && containerRef.current) {
          // Add a tiny delay to ensure the DOM is painted with full width before parsing
          setTimeout(() => {
            window.FB.XFBML.parse(containerRef.current);
          }, 100);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // When component re-renders (e.g. strict mode), re-parse if needed
  useEffect(() => {
    if (status === 'ready' && window.FB && window.FB.XFBML && containerRef.current) {
      // FB.XFBML.parse is safe to call multiple times, it only parses un-parsed elements
      window.FB.XFBML.parse(containerRef.current);
    }
  });

  return (
    <div className="fb-feed-wrapper">
      <div className="fb-feed-card">
        {/* Header */}
        <div className="fb-feed-header">
          <svg className="fb-icon" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <h3 className="fb-feed-title">Latest Facebook Updates</h3>
        </div>

        {/* Body containing the plugin */}
        <div className="fb-feed-body" ref={containerRef}>
          {status === 'loading' && (
            <div className="fb-feed-loading">
              <div className="fb-spinner"></div>
              <p>Loading Facebook updates...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="fb-feed-error">
              <p>Unable to load Facebook feed.</p>
              <a href={FB_PAGE_URL} target="_blank" rel="noopener noreferrer" className="fb-visit-btn">
                Visit our Facebook Page
              </a>
            </div>
          )}

          {/* Facebook Plugin Wrapper
              We keep it physically in the DOM so it has valid dimensions when XFBML.parse runs.
              We just make it invisible until ready. */}
          <div className="fb-plugin-container" style={{ opacity: status === 'ready' ? 1 : 0, transition: 'opacity 0.5s ease' }}>
            <div
              className="fb-page"
              data-href={FB_PAGE_URL}
              data-tabs="timeline"
              data-width="500"
              data-height="700"
              data-small-header="false"
              data-adapt-container-width="true"
              data-hide-cover="false"
              data-show-facepile="true"
            >
              <blockquote cite={FB_PAGE_URL} className="fb-xfbml-parse-ignore">
                <a href={FB_PAGE_URL}>Diredawa Prosperity Party</a>
              </blockquote>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
