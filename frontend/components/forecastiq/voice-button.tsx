"use client";

import { useState, useEffect, useCallback } from "react";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  onTranscript?: (text: string) => void;
  className?: string;
}

export function VoiceButton({ onTranscript, className }: VoiceButtonProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Check for Web Speech API support
    const SpeechRecognition =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (SpeechRecognition) {
      setIsSupported(true);
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = "en-US";

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onTranscript?.(transcript);
        setIsListening(false);
      };

      recognitionInstance.onerror = () => {
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, [onTranscript]);

  const toggleListening = useCallback(() => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  }, [recognition, isListening]);

  // Hide button if not supported
  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={toggleListening}
        className={cn(
          "w-10 h-10 rounded-full border flex items-center justify-center transition-all",
          isListening
            ? "bg-red-600 border-red-600 text-white animate-pulse"
            : "border-border hover:bg-muted",
          className
        )}
        title={isListening ? "Stop listening" : "Start voice input"}
      >
        <Mic className="w-4 h-4" />
      </button>
      {isListening && (
        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[11px] text-red-600 whitespace-nowrap">
          Listening...
        </span>
      )}
    </div>
  );
}