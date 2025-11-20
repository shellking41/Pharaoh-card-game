import React, { useEffect, useRef } from 'react';

function PlayGround({ children }) {


  return (
    <div style={{ position: 'relative', width: '100%', height: '600px' }}>
      {children}
    </div>
  );
}

export default PlayGround;
