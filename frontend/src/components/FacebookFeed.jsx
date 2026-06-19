import { useEffect, useRef, useState } from 'react';
import './FacebookFeed.css';

const FB_PAGE_URL = 'https://www.facebook.com/DiredawaProsperityparty';
const SDK_ID = 'facebook-jssdk';

function loadFbSdk() {
  return new Promise((resolve, reject) => {
    if (window.FB && window.FB.XFBML) {
      resolve(window.FB);
      return;
    }

    const existing = document.getElementById(SDK_ID);
    if (existing) {
      const check = () => {
        if (window.FB && window.FB.XFBML) {
          resolve(window.FB);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
      return;
    }

    const script = document.createElement('script');
    script.id = SDK_ID;
    script.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v21.0';
    script.onload = () => {
      const check = () => {
        if (window.FB && window.FB.XFBML) {
          resolve(window.FB);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    };
    script.onerror = () => reject(new Error('Facebook SDK failed to load'));
    document.body.appendChild(script);
  });
}

export default function FacebookFeed() {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    loadFbSdk()
      .then(() => {
        if (!mountedRef.current) return;
        setStatus('ready');
        if (window.FB && window.FB.XFBML && containerRef.current) {
          window.FB.XFBML.parse(containerRef.current);
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setStatus('error');
        }
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (status === 'ready' && window.FB && window.FB.XFBML && containerRef.current) {
      window.FB.XFBML.parse(containerRef.current);
    }
  });

  return (
    <div className="facebook-feed-wrapper">
      <div className="facebook-feed-card">
        <div className="facebook-feed-header">
          <svg className="facebook-icon" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <h3 className="facebook-feed-title">Latest Facebook Updates</h3>
        </div>

        <div className="facebook-feed-body" ref={containerRef}>
          {status === 'loading' && (
            <div className="facebook-feed-loading">
              <div className="facebook-feed-spinner" />
              <p>Loading Facebook updates...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="facebook-feed-error">
              <p>Unable to load Facebook feed. Please check back later.</p>
              <a href={FB_PAGE_URL} target="_blank" rel="noopener noreferrer" className="facebook-feed-visit-btn">
                Visit our Facebook page
              </a>
            </div>
          )}

          <div
            className="fb-page"
            data-href={FB_PAGE_URL}
            data-tabs="timeline"
            data-width="500"
            data-height="900"
            data-small-header="false"
            data-adapt-container-width="true"
            data-hide-cover="false"
            data-show-facepile="true"
            style={{ display: status === 'ready' ? 'block' : 'none' }}
          >
            <blockquote cite={FB_PAGE_URL} className="fb-xfbml-parse-ignore">
              <a href={FB_PAGE_URL}>Dire Dawa Prosperity Party</a>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}
