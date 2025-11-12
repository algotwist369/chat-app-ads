import React, { useState, useRef, useEffect } from 'react';
import { createIntersectionObserver } from './performance';

/**
 * Lazy-loaded image component with placeholder
 */
const LazyImage = ({
  src,
  alt = '',
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E',
  className = '',
  onLoad,
  onError,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // If browser supports native lazy loading, use it
    if ('loading' in HTMLImageElement.prototype) {
      img.loading = 'lazy';
      setImageSrc(src);
      return;
    }

    // Otherwise, use Intersection Observer
    const observer = createIntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px',
      }
    );

    observer.observe(img);

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [src]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    setHasError(true);
    if (onError) onError(e);
  };

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoaded ? 'loaded' : 'loading'} ${hasError ? 'error' : ''}`}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
};

export default React.memo(LazyImage);

