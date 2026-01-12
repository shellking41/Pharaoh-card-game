import React, { useRef, useEffect, useState } from 'react';

function PlayGround({ children, onDimensionsChange }) {
  const playgroundRef = useRef(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (playgroundRef.current && onDimensionsChange) {
        const { width, height } = playgroundRef.current.getBoundingClientRect();
        onDimensionsChange({ width, height });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (playgroundRef.current) {
      resizeObserver.observe(playgroundRef.current);
    }

    return () => {
      if (playgroundRef.current) {
        resizeObserver.unobserve(playgroundRef.current);
      }
    };
  }, [onDimensionsChange]);

  return (
    <div
      ref={playgroundRef}

      style={{
        position: 'relative',
        width: '100%',
        height: '70vh   ',

        overflow: 'hidden',
      }}
    >
      <div

        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'visible', // A gyerekek lehetnek láthatók
        }}>
        {children}
      </div>
    </div>
  );
}

export default PlayGround;