import React, { useState, useEffect } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const VoiceInput = ({ onSpeechResults, placeholder = "Speak your symptoms..." }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Check Web Speech API availability
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        toast.error('Voice input failed: ' + event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onSpeechResults(transcript);
        toast.success(`Voice input caught: "${transcript}"`);
      };

      setRecognition(rec);
    }
  }, [onSpeechResults]);

  const toggleListening = () => {
    if (!recognition) {
      toast.error('Voice input is not supported in this browser. Please type your symptoms instead.');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`p-3 rounded-xl border flex items-center justify-center transition-all ${
        isListening
          ? 'bg-rose-500 border-rose-500 text-white animate-pulse'
          : 'bg-[#2563EB]/10 border-transparent text-[#2563EB] hover:bg-[#2563EB]/20'
      }`}
      title={isListening ? 'Stop Listening' : 'Use Voice Input'}
    >
      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
};

export default VoiceInput;
