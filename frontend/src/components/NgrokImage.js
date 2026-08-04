import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NgrokImage = ({ src, alt, className, onError, ...props }) => {
  const [imageSrc, setImageSrc] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    // If the src is from backend/ngrok, we must fetch it via axios to inject the ngrok bypass header.
    // If src is empty or data URI, just use it directly.
    if (!src || src.startsWith('data:')) {
      setImageSrc(src);
      return;
    }

    let isMounted = true;

    const fetchImage = async () => {
      try {
        const response = await axios.get(src, {
          responseType: 'blob',
          // Header ngrok-skip-browser-warning will be injected by App.js interceptor automatically
        });
        const objectUrl = URL.createObjectURL(response.data);
        if (isMounted) {
          setImageSrc(objectUrl);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          console.error(`Gagal load image dari ${src}:`, err);
          if (onError) onError(err);
        }
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
    };
  }, [src, onError]);

  if (error || !imageSrc) {
    // Return empty or fallback if failed, or let onError handle it
    return <img src="https://ui-avatars.com/api/?name=SMK&background=fff&color=1e3a8a" alt={alt} className={className} {...props} />;
  }

  return <img src={imageSrc} alt={alt} className={className} {...props} />;
};

export default NgrokImage;
