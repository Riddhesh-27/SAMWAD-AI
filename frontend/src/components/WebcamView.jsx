import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CameraOff, RefreshCw, Sliders, ShieldAlert, CheckCircle2, Hand, Sparkles } from 'lucide-react';
import { recognizeFrame, resetStabilizer } from '../services/api';

// MediaPipe hand landmark connections (skeleton bones)
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm base
  [5, 9], [9, 13], [13, 17]
];

export default function WebcamView({ onSignRecognized, currentSign, autoAppendEnabled }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isProcessingRef = useRef(false);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment' (mobile)
  const [isMirrored, setIsMirrored] = useState(true);
  const [threshold, setThreshold] = useState(0.60);
  const [fps, setFps] = useState(0);

  // Recognition live telemetry
  const [liveResult, setLiveResult] = useState(null);
  const [stabilityScore, setStabilityScore] = useState(0);
  const [inCooldown, setInCooldown] = useState(false);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsCameraActive(true);
          resetStabilizer();
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      let errorMsg = "Unable to access webcam. Please check permissions.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMsg = "Camera permission was denied. Please allow camera access in your browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMsg = "No camera found on this device. Please connect a webcam.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMsg = "Webcam is currently in use by another application. Please close other camera apps and retry.";
      }
      setCameraError(errorMsg);
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setLiveResult(null);
    setStabilityScore(0);
    clearCanvas();
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (isCameraActive) {
      setTimeout(() => startCamera(), 100);
    }
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Draw hand landmarks and bounding boxes (supports both single and dual hands)
  const drawLandmarks = useCallback((allHands, allBboxes, sign, confidence, isAccepted) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!allHands || allHands.length === 0) return;

    const w = canvas.width;
    const h = canvas.height;

    // Draw all detected hands (Hand 1: Cyan/Blue, Hand 2: Teal/Emerald)
    allHands.forEach((landmarks, handIdx) => {
      if (!landmarks || landmarks.length !== 21) return;

      ctx.lineWidth = 3;
      ctx.strokeStyle = isAccepted 
        ? (handIdx === 0 ? 'rgba(56, 189, 248, 0.85)' : 'rgba(45, 212, 191, 0.85)')
        : 'rgba(148, 163, 184, 0.6)';

      for (const [i1, i2] of HAND_CONNECTIONS) {
        const p1 = landmarks[i1];
        const p2 = landmarks[i2];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x * w, p1.y * h);
          ctx.lineTo(p2.x * w, p2.y * h);
          ctx.stroke();
        }
      }

      // Draw landmark points
      for (let i = 0; i < landmarks.length; i++) {
        const p = landmarks[i];
        const px = p.x * w;
        const py = p.y * h;

        ctx.beginPath();
        ctx.arc(px, py, i === 0 || i % 4 === 0 ? 6 : 4, 0, 2 * Math.PI);
        ctx.fillStyle = handIdx === 0 
          ? (i === 0 ? '#38bdf8' : (i % 4 === 0 ? '#2dd4bf' : '#ffffff'))
          : (i === 0 ? '#2dd4bf' : (i % 4 === 0 ? '#34d399' : '#ffffff'));
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
      }
    });

    // Draw bounding box on primary hand
    const bbox = (allBboxes && allBboxes.length > 0) ? allBboxes[0] : null;
    if (bbox && sign) {
      const bx = (bbox.x_min / 640) * w;
      const by = (bbox.y_min / 480) * h;
      const bw = (bbox.width / 640) * w;
      const bh = (bbox.height / 480) * h;

      ctx.lineWidth = 2;
      ctx.strokeStyle = isAccepted ? '#10b981' : '#f59e0b';
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);

      const labelText = `${sign} (${Math.round(confidence * 100)}%)`;
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      const textWidth = ctx.measureText(labelText).width;

      ctx.fillStyle = isAccepted ? '#10b981' : '#f59e0b';
      ctx.fillRect(bx, Math.max(0, by - 26), textWidth + 14, 22);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, bx + 7, Math.max(16, by - 10));
    }
  }, []);

  // Frame processing loop
  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();
    let frameCount = 0;

    const processFrame = async () => {
      if (!isCameraActive || isProcessingRef.current) {
        animationFrameId = setTimeout(processFrame, 150);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || video.readyState < 2 || !canvas) {
        animationFrameId = setTimeout(processFrame, 150);
        return;
      }

      // Sync canvas dimensions
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      isProcessingRef.current = true;

      try {
        // Create offscreen canvas to capture current video frame as base64 JPEG
        // Optimized 256x192 resolution with 0.50 JPEG quality for ultra-low latency sub-40ms inference
        const offscreen = document.createElement('canvas');
        offscreen.width = 256;
        offscreen.height = 192;
        const offCtx = offscreen.getContext('2d');

        if (isMirrored) {
          offCtx.translate(offscreen.width, 0);
          offCtx.scale(-1, 1);
        }
        offCtx.drawImage(video, 0, 0, offscreen.width, offscreen.height);

        const base64Image = offscreen.toDataURL('image/jpeg', 0.50);

        // Send to FastAPI MediaPipe 2-hand + conversational gesture pipeline
        const result = await recognizeFrame(base64Image, threshold);

        setLiveResult(result);

        if (result.hand_detected && (result.all_landmarks || result.landmarks)) {
          const handsToDraw = (result.all_landmarks && result.all_landmarks.length > 0)
            ? result.all_landmarks 
            : [result.landmarks];
          const bboxesToDraw = result.all_bboxes || (result.bbox ? [result.bbox] : []);

          drawLandmarks(
            handsToDraw, 
            bboxesToDraw, 
            result.raw_sign || result.sign, 
            result.confidence, 
            result.accepted
          );

          if (result.stabilizer) {
            setStabilityScore(result.stabilizer.stability_score || 0);
            setInCooldown(result.stabilizer.in_cooldown || false);

            // Auto-append if stabilized and ready
            if (result.stabilizer.ready_to_append && result.stabilizer.stabilized_sign) {
              if (autoAppendEnabled) {
                onSignRecognized(result.stabilizer.stabilized_sign);
              }
            }
          }
        } else {
          clearCanvas();
          setStabilityScore(0);
          setInCooldown(false);
        }

        // Calculate live FPS
        frameCount++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
          setFps(Math.round((frameCount * 1000) / (now - lastTime)));
          frameCount = 0;
          lastTime = now;
        }

      } catch (err) {
        console.warn("Frame capture loop error:", err);
      } finally {
        isProcessingRef.current = false;
        // Stable, deliberate frame interval (90ms gives ~8 FPS and eliminates twitchy duplicate triggers)
        animationFrameId = setTimeout(processFrame, 90);
      }
    };

    if (isCameraActive) {
      processFrame();
    } else {
      clearCanvas();
    }

    return () => {
      clearTimeout(animationFrameId);
    };
  }, [isCameraActive, isMirrored, threshold, autoAppendEnabled, drawLandmarks, onSignRecognized]);

  return (
    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
      {/* Video Container Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: isCameraActive ? '#10b981' : '#64748b'
          }} className={isCameraActive ? 'animate-pulse-dot' : ''} />
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Live Vision Feed</h2>
          {isCameraActive && (
            <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
              {fps} FPS
            </span>
          )}
        </div>

        {/* Camera Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {!isCameraActive ? (
            <button className="btn btn-primary" onClick={startCamera}>
              <Camera size={16} />
              <span>Start Camera</span>
            </button>
          ) : (
            <>
              <button className="btn btn-danger" onClick={stopCamera}>
                <CameraOff size={16} />
                <span>Stop</span>
              </button>
              <button className="btn btn-secondary" onClick={toggleCameraFacing} title="Switch Front / Rear camera (Android)">
                <RefreshCw size={15} />
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setIsMirrored(!isMirrored)} 
                title="Toggle Mirror View"
                style={{ fontSize: '0.8rem' }}
              >
                {isMirrored ? 'Mirrored' : 'Normal'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Feature Info Banner: Two-Hand Conversational Sign Engine */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
        marginBottom: '0.85rem',
        padding: '0.45rem 0.85rem',
        backgroundColor: 'rgba(2, 132, 199, 0.08)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(2, 132, 199, 0.25)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#38bdf8' }}>
          <Sparkles size={15} color="#38bdf8" />
          <span style={{ fontWeight: '700' }}>Conversational Word Mode:</span>
          <span style={{ color: 'var(--text-muted)' }}>Two-Hand & Single-Hand Gestures (WANT, HELP, YOU, WATER, FOOD, etc.)</span>
        </div>
        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
          Full Word Gestures Only
        </span>
      </div>

      {/* Camera Error Message */}
      {cameraError && (
        <div style={{
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          marginBottom: '1rem'
        }}>
          <ShieldAlert size={18} style={{ flexShrink: 0 }} />
          <div>{cameraError}</div>
        </div>
      )}

      {/* Video & Canvas Viewport */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '4 / 3',
        maxHeight: '420px',
        backgroundColor: '#050811',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* HTML5 Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: isMirrored ? 'scaleX(-1)' : 'none',
            display: isCameraActive ? 'block' : 'none'
          }}
        />

        {/* Landmark Overlay Canvas */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: isMirrored ? 'scaleX(-1)' : 'none',
            pointerEvents: 'none',
            display: isCameraActive ? 'block' : 'none'
          }}
        />

        {/* Camera Idle Placeholder */}
        {!isCameraActive && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: 'var(--text-muted)'
            }}>
              <Hand size={32} />
            </div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>Camera is Inactive</h3>
            <p style={{ fontSize: '0.85rem', maxWidth: '320px', margin: '0 auto 1.25rem' }}>
              Click "Start Camera" to detect hand gestures and begin sign translation in real-time.
            </p>
            <button className="btn btn-primary" onClick={startCamera}>
              <Camera size={16} />
              <span>Enable Camera</span>
            </button>
          </div>
        )}

        {/* Active Recognition Overlay HUD */}
        {isCameraActive && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            right: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            {/* Live Sign Badge */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                fontSize: '1.8rem',
                fontWeight: '800',
                fontFamily: 'var(--font-mono)',
                color: liveResult?.accepted ? '#38bdf8' : '#94a3b8',
                lineHeight: 1
              }}>
                {liveResult?.sign || liveResult?.raw_sign || '—'}
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {liveResult?.hand_detected ? (
                    liveResult.accepted ? (
                      <>
                        <span style={{ color: '#34d399', fontWeight: '600' }}>✓ Word Gesture</span>
                        <span style={{
                          fontSize: '0.65rem',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(16, 185, 129, 0.25)',
                          color: '#34d399',
                          fontWeight: '700'
                        }}>
                          {liveResult?.category === 'two_hand_word_sign' ? '2-HAND' : '1-HAND'}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: '#fbbf24' }}>Hold Sign Steady (&lt;{Math.round(threshold * 100)}%)</span>
                    )
                  ) : (
                    <span>Align Hand(s) in Frame</span>
                  )}
                </div>

                {liveResult?.confidence > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <div style={{
                      width: '80px',
                      height: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.round((liveResult?.confidence || 0) * 100)}%`,
                        height: '100%',
                        backgroundColor: liveResult?.accepted ? '#10b981' : '#f59e0b',
                        transition: 'width 0.2s ease'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                      {Math.round((liveResult?.confidence || 0) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stability Progress Indicator */}
            {stabilityScore > 0 && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '0.25rem'
              }}>
                <div style={{ fontSize: '0.7rem', color: inCooldown ? '#f87171' : '#38bdf8', fontWeight: '600' }}>
                  {inCooldown ? 'Cooldown Debounce' : `Stability: ${Math.round(stabilityScore * 100)}%`}
                </div>
                <div style={{
                  width: '90px',
                  height: '5px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${Math.round(stabilityScore * 100)}%`,
                    height: '100%',
                    backgroundColor: inCooldown ? '#ef4444' : (stabilityScore >= 0.65 ? '#10b981' : '#38bdf8'),
                    transition: 'width 0.15s ease'
                  }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sensitivity Slider & Help */}
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem 1rem',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
          <Sliders size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Confidence Filter:</span>
          <input
            type="range"
            min="0.40"
            max="0.85"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', minWidth: '35px' }}>
            {Math.round(threshold * 100)}%
          </span>
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          {isCameraActive ? 'Holding a sign steady for ~0.8s will auto-lock it.' : 'Webcam frames are processed locally.'}
        </div>
      </div>
    </div>
  );
}
