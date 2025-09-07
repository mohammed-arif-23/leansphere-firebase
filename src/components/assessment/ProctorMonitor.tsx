"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Camera, Eye, EyeOff, AlertTriangle, Shield, Mic, MicOff } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface ProctorEvent {
  id: string;
  type: 'tab_switch' | 'face_detection' | 'multiple_faces' | 'no_face' | 'suspicious_movement' | 'audio_detected' | 'window_blur' | 'fullscreen_exit';
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  confidence?: number;
}

interface ProctorMonitorProps {
  examId: string;
  studentId: string;
  onViolation: (event: ProctorEvent) => void;
  isActive: boolean;
  strictMode?: boolean;
}

export default function ProctorMonitor({
  examId,
  studentId,
  onViolation,
  isActive,
  strictMode = false
}: ProctorMonitorProps) {
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [violations, setViolations] = useState<ProctorEvent[]>([]);
  const [faceDetected, setFaceDetected] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const { trackEvent } = useAnalytics();

  const createViolation = useCallback((
    type: ProctorEvent['type'],
    severity: ProctorEvent['severity'],
    description: string,
    confidence?: number
  ) => {
    const violation: ProctorEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      severity,
      description,
      confidence
    };
    
    setViolations(prev => [...prev, violation]);
    onViolation(violation);
    
    trackEvent('proctoring_violation', {
      examId,
      studentId,
      violationType: type,
      severity,
      confidence: confidence || 0
    });
  }, [examId, studentId, onViolation, trackEvent]);

  // Initialize camera and microphone
  const initializeMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true
      });
      
      streamRef.current = stream;
      setCameraPermission('granted');
      setMicPermission('granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Setup audio monitoring
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      return true;
    } catch (error) {
      console.error('Media access denied:', error);
      setCameraPermission('denied');
      setMicPermission('denied');
      return false;
    }
  }, []);

  // Face detection using basic computer vision
  const detectFace = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Simple face detection using brightness analysis
    // In production, you'd use a proper face detection library like face-api.js
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let brightPixels = 0;
    let totalPixels = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (brightness > 100) brightPixels++;
    }
    
    const faceConfidence = brightPixels / totalPixels;
    const hasFace = faceConfidence > 0.3 && faceConfidence < 0.8;
    
    if (hasFace !== faceDetected) {
      setFaceDetected(hasFace);
      
      if (!hasFace) {
        createViolation(
          'no_face',
          'high',
          'No face detected in camera feed',
          1 - faceConfidence
        );
      }
    }
  }, [faceDetected, createViolation]);

  // Audio level monitoring
  const monitorAudio = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    
    if (average > 50) { // Threshold for suspicious audio
      createViolation(
        'audio_detected',
        'medium',
        'Unusual audio activity detected',
        average / 255
      );
    }
  }, [createViolation]);

  // Tab switching and window focus monitoring
  useEffect(() => {
    if (!isActive) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        createViolation(
          'tab_switch',
          'high',
          'Student switched tabs or minimized window'
        );
      }
    };
    
    const handleWindowBlur = () => {
      createViolation(
        'window_blur',
        'medium',
        'Window lost focus'
      );
    };
    
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        createViolation(
          'fullscreen_exit',
          'high',
          'Student exited fullscreen mode'
        );
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isActive, createViolation]);

  // Start monitoring
  const startMonitoring = useCallback(async () => {
    const mediaInitialized = await initializeMedia();
    if (!mediaInitialized) return;
    
    setIsMonitoring(true);
    
    // Start periodic monitoring
    intervalRef.current = setInterval(() => {
      detectFace();
      monitorAudio();
    }, 2000);
    
    trackEvent('proctoring_started', { examId, studentId });
  }, [initializeMedia, detectFace, monitorAudio, examId, studentId, trackEvent]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    trackEvent('proctoring_stopped', { 
      examId, 
      studentId, 
      violationCount: violations.length,
      tabSwitches: tabSwitchCount
    });
  }, [examId, studentId, violations.length, tabSwitchCount, trackEvent]);

  useEffect(() => {
    if (isActive && !isMonitoring) {
      startMonitoring();
    } else if (!isActive && isMonitoring) {
      stopMonitoring();
    }
    
    return () => {
      stopMonitoring();
    };
  }, [isActive, isMonitoring, startMonitoring, stopMonitoring]);

  const getViolationColor = (severity: ProctorEvent['severity']) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getViolationIcon = (type: ProctorEvent['type']) => {
    switch (type) {
      case 'tab_switch': return '🔄';
      case 'face_detection': return '👤';
      case 'no_face': return '❌';
      case 'multiple_faces': return '👥';
      case 'audio_detected': return '🔊';
      case 'window_blur': return '🪟';
      case 'fullscreen_exit': return '📱';
      default: return '⚠️';
    }
  };

  if (cameraPermission === 'denied' || micPermission === 'denied') {
    return (
      <Alert className="border-destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Camera and microphone access is required for proctored exams. Please enable permissions and refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Exam Proctoring
            {isMonitoring && <Badge variant="default" className="ml-2">Active</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Feed */}
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full max-w-xs rounded-lg border"
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute top-2 right-2 flex gap-1">
              {faceDetected ? (
                <Badge variant="default" className="bg-green-500">
                  <Eye className="h-3 w-3 mr-1" />
                  Face Detected
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <EyeOff className="h-3 w-3 mr-1" />
                  No Face
                </Badge>
              )}
            </div>
          </div>

          {/* Monitoring Status */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Camera className={`h-4 w-4 ${cameraPermission === 'granted' ? 'text-green-500' : 'text-red-500'}`} />
              <span>Camera: {cameraPermission}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mic className={`h-4 w-4 ${micPermission === 'granted' ? 'text-green-500' : 'text-red-500'}`} />
              <span>Microphone: {micPermission}</span>
            </div>
          </div>

          {/* Violation Summary */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Tab Switches: {tabSwitchCount}</span>
            <span className="text-sm font-medium">Total Violations: {violations.length}</span>
          </div>

          {/* Recent Violations */}
          {violations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recent Violations:</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {violations.slice(-5).map((violation) => (
                  <div key={violation.id} className="flex items-center gap-2 text-xs p-2 rounded border">
                    <span>{getViolationIcon(violation.type)}</span>
                    <span className="flex-1">{violation.description}</span>
                    <Badge variant={getViolationColor(violation.severity)} className="text-xs">
                      {violation.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {strictMode && violations.length > 5 && (
            <Alert className="border-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Multiple violations detected. Your exam may be flagged for review.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
