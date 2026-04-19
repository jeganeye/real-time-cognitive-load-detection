import React, { useEffect, useRef, useState } from 'react';
import { ScanFace } from 'lucide-react';

const WebcamSection = ({ activeMode, hasPermission, setHasPermission, setLoadLevel, setRealTimeScore }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // HUD UI stats
  const [stats, setStats] = useState({ micState: 'Off', postureState: 'Analyzing' });

  useEffect(() => {
    let stream = null;
    let isMounted = true;
    let audioContext = null;
    let analyser = null;
    let animationFrameId = null;
    let lastImageData = null;

    async function setupMedia() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
        setStats({ micState: 'Listening...', postureState: 'Active' });

        // Setup Audio Analyser
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Throttle updates purely for UI visual speed, although loop runs at 60fps
        let frameCount = 0;

        const analyzeFrame = () => {
          if (!isMounted) return;

          // 1. Audio Vol (0 to ~255)
          analyser.getByteFrequencyData(dataArray);
          let sumAudio = 0;
          for (let i = 0; i < dataArray.length; i++) sumAudio += dataArray[i];
          const audioVol = sumAudio / dataArray.length;

          // 2. Video Motion
          let motionScore = 0;
          if (videoRef.current && videoRef.current.readyState === 4) {
             // Draw current video frame (small res 64x48 to be extremely fast CPU-wise)
             ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
             const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
             
             if (lastImageData) {
                let diff = 0;
                for (let i = 0; i < currentData.data.length; i += 4) {
                   const rDiff = Math.abs(currentData.data[i] - lastImageData.data[i]);
                   const gDiff = Math.abs(currentData.data[i+1] - lastImageData.data[i+1]);
                   const bDiff = Math.abs(currentData.data[i+2] - lastImageData.data[i+2]);
                   // Threshold for meaningful pixel change
                   if (rDiff + gDiff + bDiff > 80) diff++;
                }
                motionScore = diff / (canvas.width * canvas.height); // % of pixels changed (0.0 to 1.0)
             }
             lastImageData = currentData;
          }

          // 3. Compute Real-Time Load 
          // Scale tuning: Audio goes up to ~100 usually, Motion goes up to maybe 0.3
          const normalizedAudio = Math.min(100, audioVol * 1.5); 
          const normalizedMotion = Math.min(100, motionScore * 400); // 25% change = 100
          
          // Weighted combination mapping exactly to out dashboard outputs
          const combined = Math.min(100, Math.max(0, (normalizedAudio * 0.4) + (normalizedMotion * 0.6))); 
          
          // Send 60fps precise score directly into graph memory
          setRealTimeScore(Math.round(combined));

          // Calculate Load Level (Throttled per ~30 frames so UI doesn't visually glitch constantly)
          frameCount++;
          if (frameCount > 20) {
            frameCount = 0;
            if (combined > 45) {
                setLoadLevel('High');
            } else if (combined > 15) {
                setLoadLevel('Medium');
            } else {
                setLoadLevel('Low');
            }
          }

          // Loop
          animationFrameId = requestAnimationFrame(analyzeFrame);
        };
        
        // Wait a slight bit for video to be ready before starting loop
        setTimeout(() => {
           if (isMounted) analyzeFrame();
        }, 1000);

      } catch (err) {
        if (isMounted) {
          console.error("Error accessing media devices.", err);
          setErrorMsg("Please enable Camera icon in URL bar, then refresh.");
        }
      }
    }
    setupMedia();

    return () => {
      isMounted = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (analyser) analyser.disconnect();
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [setHasPermission, setLoadLevel, setRealTimeScore]);

  return (
    <div className="glass-panel webcam-container">
      <div className="webcam-header">
        <div className="webcam-dot" style={{ background: hasPermission ? 'var(--color-green)' : 'var(--color-red)' }}></div>
        <span>Live Feed - {activeMode} {hasPermission ? '(Active Processing)' : '(Waiting for Permissions)'}</span>
      </div>
      
      <div className="webcam-view">
        <canvas ref={canvasRef} width={64} height={48} style={{ display: 'none' }} />
        {hasPermission && <video ref={videoRef} autoPlay playsInline muted className="actual-webcam-feed" />}
        {!hasPermission && !errorMsg && <ScanFace size={64} className="neon-glow" style={{ color: 'var(--accent-purple)', opacity: 0.5, zIndex: 1 }} />}
        {errorMsg && <div style={{ color: 'var(--color-red)', zIndex: 10, textAlign: 'center', padding: '20px' }}>{errorMsg}</div>}
        
        <div className="scanner-line"></div>
        <div className="face-box"></div>
        <div className="overlay-stats">
          <div className="stat-pill">Movement: {hasPermission ? stats.postureState : 'Offline'}</div>
          <div className="stat-pill">Mic Vol: {hasPermission ? stats.micState : 'Offline'}</div>
        </div>
      </div>

      <style>{`
        .webcam-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 20px;
          border: 2px solid transparent;
          animation: glowingBorder 4s infinite;
        }
        .webcam-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          color: var(--text-secondary);
        }
        .webcam-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          box-shadow: 0 0 10px currentColor;
          animation: pulse 2s infinite;
        }
        .webcam-view {
          flex: 1;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .actual-webcam-feed {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
          opacity: 0.8;
          border-radius: 12px;
        }
        .scanner-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--accent-cyan);
          box-shadow: 0 0 10px var(--accent-cyan), 0 0 20px var(--accent-cyan);
          animation: scanline 3s linear infinite;
          z-index: 2;
        }
        .face-box {
          position: absolute;
          width: 250px;
          height: 250px;
          border: 2px dashed rgba(34, 211, 238, 0.6);
          border-radius: 20px;
          animation: pulse 4s infinite;
          z-index: 2;
        }
        .overlay-stats {
          position: absolute;
          bottom: 20px;
          left: 20px;
          display: flex;
          gap: 12px;
          z-index: 3;
        }
        .stat-pill {
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(34, 211, 238, 0.3);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          color: var(--accent-cyan);
          backdrop-filter: blur(4px);
        }
      `}</style>
    </div>
  );
};

export default WebcamSection;
