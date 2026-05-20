'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface SelfieCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (image: string, faceFingerprint?: string) => void;
  officeZone?: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    name: string;
  } | null;
}

const OFFICE_ZONES = [
  { lat: 12.935472, lng: 77.608333, radius: 150 },
  { lat: 13.0363, lng: 77.5111, radius: 150 },
];

function isWithinAnyZone(lat: number, lng: number): boolean {
  return OFFICE_ZONES.some(zone => haversineDistance(lat, lng, zone.lat, zone.lng) <= zone.radius);
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type LivenessStep = 'blink' | 'challenge' | 'done';

export default function SelfieCapture({ open, onClose, onCapture }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState<LivenessStep>('blink');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceLandmarkerRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const stepRef = useRef<LivenessStep>('blink');
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const hasCapturedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { locationRef.current = location; }, [location]);

  useEffect(() => {
    if (open) {
      hasCapturedRef.current = false;
      setStep('blink');
      setError(null);
      setLocationError(null);
      setLocation(null);
      setFaceDetected(false);
      setCapturing(false);
      startCamera();
      loadMediapipe();
      fetchLocation();
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported.");
      setLocation({ lat: 0, lng: 0 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        setLocationError(null);
      },
      () => {
        // Don't block capture — proceed with zeroed coords, server validates
        setLocationError("Location unavailable");
        setLocation({ lat: 0, lng: 0 });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const startCamera = async () => {
    setLoading(true);
    setError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = s;
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.muted = true;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      setError("Camera access denied. Please allow camera permission and try again.");
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setStream(null);
    setStep('blink');
  };

  const loadMediapipe = async () => {
    try {
      const vision = await import('@mediapipe/tasks-vision');
      const { FaceLandmarker, FilesetResolver } = vision;
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "CPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });
      faceLandmarkerRef.current = faceLandmarker;
      requestAnimationFrame(predict);
    } catch {
      setError("AI model failed to load. Please check your connection and try again.");
    }
  };

  const predict = () => {
    if (hasCapturedRef.current) return;

    if (!videoRef.current || !faceLandmarkerRef.current || videoRef.current.readyState < 2) {
      animationRef.current = requestAnimationFrame(predict);
      return;
    }

    try {
      const results = faceLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
      const hasFace = results?.faceLandmarks?.length > 0;
      setFaceDetected(hasFace);

      if (hasFace && results.faceBlendshapes?.[0]?.categories) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bs = results.faceBlendshapes[0].categories;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const eyeBlinkLeft  = bs.find((c: any) => c.categoryName === 'eyeBlinkLeft')?.score  || 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const eyeBlinkRight = bs.find((c: any) => c.categoryName === 'eyeBlinkRight')?.score || 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const smileL = bs.find((c: any) => c.categoryName === 'mouthSmileLeft')?.score  || 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const smileR = bs.find((c: any) => c.categoryName === 'mouthSmileRight')?.score || 0;

        let nextStep: LivenessStep = stepRef.current;
        if (stepRef.current === 'blink' && (eyeBlinkLeft > 0.4 || eyeBlinkRight > 0.4)) {
          nextStep = 'challenge';
        } else if (stepRef.current === 'challenge' && (smileL > 0.5 || smileR > 0.5)) {
          nextStep = 'done';
        }

        if (nextStep !== stepRef.current) {
          setStep(nextStep);
        }

        if (nextStep === 'done' && !hasCapturedRef.current) {
          hasCapturedRef.current = true;
          setCapturing(true);

          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
          }

          requestAnimationFrame(() => {
            try {
              handleCapture();
            } catch (err) {
              console.error('Capture failed:', err);
              hasCapturedRef.current = false;
              setCapturing(false);
              setStep('blink');
              setError('Capture failed. Please try again.');
            }
          });
        }
      }
    } catch (err) {
      console.warn('Detection frame error:', err);
    }

    if (!hasCapturedRef.current) {
      animationRef.current = requestAnimationFrame(predict);
    }
  };

  const handleCapture = () => {
    const currentLocation = locationRef.current;

    // If location hasn't resolved yet, poll up to 3s then proceed anyway
    if (!currentLocation) {
      let waited = 0;
      const poll = setInterval(() => {
        waited += 200;
        if (locationRef.current) {
          clearInterval(poll);
          doCapture(locationRef.current);
        } else if (waited >= 3000) {
          clearInterval(poll);
          doCapture({ lat: 0, lng: 0 });
        }
      }, 200);
      return;
    }

    doCapture(currentLocation);
  };

  const doCapture = (loc: { lat: number; lng: number }) => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;

    // Mirror horizontally so selfie matches what user sees
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    // Overlay bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, h - 80, w, 80);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Inter, sans-serif';
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    ctx.fillText(`\u{1F552} ${now} IST`, 12, h - 52);
    if (loc.lat !== 0 || loc.lng !== 0) {
      ctx.fillText(`\u{1F4CD} ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`, 12, h - 28);
    } else {
      ctx.fillText(`\u{1F4CD} Location pending`, 12, h - 28);
    }
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.roundRect(w - 155, h - 58, 140, 36, 8);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText('VERIFIED LIVE', w - 140, h - 35);

    console.log('[DEBUG-SELFIE] doCapture executing with location:', loc);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    console.log('[DEBUG-SELFIE] invoking onCapture callback');
    onCapture(dataUrl);
    console.log('[DEBUG-SELFIE] invoking onClose callback');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-sm sm:max-w-md bg-white p-0 overflow-hidden border-none shadow-2xl rounded-3xl mx-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Verification</DialogTitle>
          <DialogDescription>Liveness check</DialogDescription>
        </DialogHeader>
        <div className="relative bg-black" style={{ aspectRatio: '3/4' }}>
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 z-20">
              <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
              <p className="text-sm font-medium">Starting Camera...</p>
            </div>
          )}

          {/* Mirror the video so it feels like a selfie camera */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ transform: 'scaleX(-1)' }}
            className={`w-full h-full object-cover ${loading ? 'opacity-0' : 'opacity-100'}`}
          />

          <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-20">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-full">
                  {faceDetected ? 'Face Detected' : 'No Face Detected'}
                </span>
              </div>

              {step === 'blink' && (
                <div className="bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 animate-pulse">
                  <p className="text-white text-base font-bold">Please Blink Your Eyes 👁️</p>
                </div>
              )}
              {step === 'challenge' && (
                <div className="bg-orange-500/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-orange-500/50 animate-pulse">
                  <p className="text-white text-base font-bold">Please Smile! 😊</p>
                </div>
              )}
              {step === 'done' && (
                <div className="bg-emerald-500/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-emerald-500/50">
                  <p className="text-emerald-400 text-base font-bold">Verified! Capturing...</p>
                </div>
              )}

              {!loading && location && location.lat !== 0 && (
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isWithinAnyZone(location.lat, location.lng) ? 'bg-green-500' : 'bg-orange-500'}`} />
                  <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">
                    {isWithinAnyZone(location.lat, location.lng) ? 'Within Office Range' : 'Outside Office Boundary'}
                  </span>
                </div>
              )}
              {!loading && locationError && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="text-[10px] font-bold text-yellow-300 uppercase tracking-widest">
                    Location pending...
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white z-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm text-center">
            {error}
            <button
              onClick={() => { setError(null); startCamera(); loadMediapipe(); fetchLocation(); }}
              className="block mx-auto mt-2 text-xs underline"
            >
              Retry
            </button>
          </div>
        )}

        {capturing && !error && (
          <div className="p-3 bg-emerald-50 text-emerald-700 text-xs text-center font-medium">
            Capturing selfie...
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
