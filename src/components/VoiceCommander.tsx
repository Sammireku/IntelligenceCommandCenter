import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, HelpCircle, X, Check } from 'lucide-react';
import { playTacticalBlip } from '../utils/audio.js';

interface VoiceCommanderProps {
  onTriggerSweep: () => Promise<void>;
  onResynthesize: () => Promise<void>;
  onOpenWhatsApp: () => void;
  onOpenHistory: () => void;
  onOpenWatchlist: () => void;
}

export const VoiceCommander: React.FC<VoiceCommanderProps> = ({
  onTriggerSweep,
  onResynthesize,
  onOpenWhatsApp,
  onOpenHistory,
  onOpenWatchlist,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setTranscript('Listening for tactical voice commands...');
      };

      rec.onresult = (event: any) => {
        const speechToText = event.results[0][0].transcript;
        setTranscript(speechToText);
        processCommand(speechToText);
      };

      rec.onerror = (e: any) => {
        console.warn('Speech recognition error', e);
        setIsListening(false);
        if (e.error === 'not-allowed') {
          setTranscript('Voice Permission Denied.');
        } else {
          setTranscript(`Error: ${e.error}`);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!supported) {
      alert('Speech Recognition is not fully supported in this browser. Please open in a new tab or use Chrome.');
      return;
    }
    playTacticalBlip(1300);
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        setTranscript('');
        recognitionRef.current?.start();
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const processCommand = (text: string) => {
    const cleanText = text.toLowerCase().trim();
    setLastCommand(cleanText);
    playTacticalBlip(1550);

    // Zoom Commands
    if (cleanText.includes('zoom in') || cleanText.includes('magnify')) {
      window.dispatchEvent(new CustomEvent('map-command', { detail: { action: 'zoom-in' } }));
      speakFeedback('Zooming in');
    } else if (cleanText.includes('zoom out') || cleanText.includes('minimize')) {
      window.dispatchEvent(new CustomEvent('map-command', { detail: { action: 'zoom-out' } }));
      speakFeedback('Zooming out');
    } else if (cleanText.includes('reset zoom') || cleanText.includes('reset map') || cleanText.includes('default zoom')) {
      window.dispatchEvent(new CustomEvent('map-command', { detail: { action: 'reset-zoom' } }));
      speakFeedback('Resetting map coordinate focus');
    } else if (cleanText.includes('center') || cleanText.includes('center on me') || cleanText.includes('find me')) {
      window.dispatchEvent(new CustomEvent('map-command', { detail: { action: 'center' } }));
      speakFeedback('Centering on user node');
    }
    // Action/Trigger Commands
    else if (cleanText.includes('sweep') || cleanText.includes('trigger sweep') || cleanText.includes('update data')) {
      speakFeedback('Initiating full network intelligence sweep');
      onTriggerSweep();
    } else if (cleanText.includes('synthesize') || cleanText.includes('summarize') || cleanText.includes('intel synthesis')) {
      speakFeedback('Re-synthesizing temporal briefing');
      onResynthesize();
    }
    // Modal Open Commands
    else if (cleanText.includes('whatsapp') || cleanText.includes('phone') || cleanText.includes('alert hub')) {
      speakFeedback('Opening WhatsApp Alert Hub configuration');
      onOpenWhatsApp();
    } else if (cleanText.includes('history') || cleanText.includes('snapshots') || cleanText.includes('archive')) {
      speakFeedback('Opening historical snapshots archive');
      onOpenHistory();
    } else if (cleanText.includes('watchlist') || cleanText.includes('assets') || cleanText.includes('track list')) {
      speakFeedback('Opening High Value Assets Watchlist');
      onOpenWatchlist();
    } else {
      speakFeedback(`Command unrecognized: ${cleanText}`);
    }
  };

  const speakFeedback = (message: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-40 font-mono text-xs">
      <div className="flex items-center gap-2">
        {/* Main Microphone Action button */}
        <button
          type="button"
          onClick={toggleListening}
          className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 shadow-xl ${
            isListening
              ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse ring-4 ring-rose-500/20'
              : 'bg-[#070d18]/95 border-[#162338] text-[#00ff41] hover:text-white hover:border-[#00ff41]/50'
          }`}
          title="Tactical Voice Transceiver (Speak commands)"
        >
          {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-emerald-500" />}
        </button>

        {/* Dynamic status panel */}
        {(transcript || lastCommand) && (
          <div className="bg-[#070d18]/95 border border-[#162338] rounded-lg p-2 max-w-xs shadow-2xl backdrop-blur-md flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 border-b border-[#162338] pb-1 text-[9px] text-[#55718a] font-bold">
              <span>🛰️ VOICE COMM CENTER</span>
              <button onClick={() => { setTranscript(''); setLastCommand(''); }} className="text-[#666] hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
            {isListening ? (
              <div className="flex items-center gap-1 text-rose-300 font-bold animate-pulse text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Active Link... Speak Now</span>
              </div>
            ) : (
              lastCommand && (
                <div className="text-[10px] text-[#00ff41] font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span className="text-[#888]">Last:</span>
                  <span className="truncate max-w-[140px] italic">"{lastCommand}"</span>
                </div>
              )
            )}
            {transcript && (
              <p className="text-[10px] text-[#b4c6d8] leading-tight max-w-[180px] break-words">
                {transcript}
              </p>
            )}
          </div>
        )}

        {/* Small help toggle */}
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="w-6 h-6 rounded-full bg-[#070d18]/90 border border-[#162338] text-[#55718a] hover:text-[#00ff41] flex items-center justify-center transition-colors"
          title="List Voice Commands"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Help Modal Popup */}
      {showHelp && (
        <div className="absolute bottom-12 left-0 w-64 bg-[#070d18]/98 border border-[#162338] rounded-lg p-3 shadow-2xl backdrop-blur-md text-[10px] space-y-2">
          <div className="flex items-center justify-between border-b border-[#162338] pb-1.5">
            <span className="text-[#00ff41] font-bold">TACTICAL VOICE PROTOCOLS</span>
            <button onClick={() => setShowHelp(false)} className="text-[#666] hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1 text-[#b4c6d8] max-h-40 overflow-y-auto pr-1">
            <p className="text-[#55718a] font-bold border-b border-[#162338]/40 pb-0.5">🗺️ MAP CONTROLS</p>
            <div className="flex justify-between"><span className="font-bold text-white">"Zoom In"</span><span>Magnifies radar map</span></div>
            <div className="flex justify-between"><span className="font-bold text-white">"Zoom Out"</span><span>Minimizes radar map</span></div>
            <div className="flex justify-between"><span className="font-bold text-white">"Reset Zoom"</span><span>Default perspective</span></div>
            <div className="flex justify-between"><span className="font-bold text-white">"Center"</span><span>Focus on user node</span></div>
            
            <p className="text-[#55718a] font-bold border-b border-[#162338]/40 pt-1.5 pb-0.5">⚡ SYSTEM ACTIONS</p>
            <div className="flex justify-between"><span className="font-bold text-white">"Sweep"</span><span>Trigger full data reload</span></div>
            <div className="flex justify-between"><span className="font-bold text-white">"Synthesize"</span><span>Trigger AI summaries</span></div>
            
            <p className="text-[#55718a] font-bold border-b border-[#162338]/40 pt-1.5 pb-0.5">📂 COMMAND DECKS</p>
            <div className="flex justify-between"><span className="font-bold text-white">"WhatsApp"</span><span>WhatsApp Dispatch</span></div>
            <div className="flex justify-between"><span className="font-bold text-white">"History"</span><span>Snapshot Archives</span></div>
            <div className="flex justify-between"><span className="font-bold text-white">"Watchlist"</span><span>High-Value Assets</span></div>
          </div>
        </div>
      )}
    </div>
  );
};
