export function createVoice({ onState, onTranscript, onSpeech }) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synthesis = window.speechSynthesis;
  let session;
  let speech;
  let preparing = false;
  let stopped = false;

  async function start(language) {
    if (session || preparing) return;
    if (!Recognition || typeof Recognition.available !== 'function') {
      onState('voiceUnavailable');
      return;
    }
    const recognizer = new Recognition();
    if (!('processLocally' in recognizer)) {
      onState('voiceUnavailable');
      return;
    }

    preparing = true;
    stopped = false;
    onState('voiceChecking');
    const locales = language === 'te' ? ['te-IN'] : ['en-IN', 'en-US', 'en-GB'];
    let locale;
    try {
      for (const candidate of locales) {
        const state = await Recognition.available({ langs: [candidate], processLocally: true });
        if (stopped) return;
        if (state === 'available') { locale = candidate; break; }
      }
      if (!locale) {
        preparing = false;
        onState('voicePack');
        return;
      }
      recognizer.lang = locale;
      recognizer.processLocally = true;
      recognizer.continuous = false;
      recognizer.interimResults = false;
      let resultState = '';
      recognizer.onstart = () => onState('voiceListening');
      recognizer.onspeechend = () => onState('voiceProcessing');
      recognizer.onresult = event => {
        const text = event.results[event.resultIndex][0].transcript.trim();
        if (text) resultState = onTranscript(text) === false ? 'privacyBlocked' : 'voiceReady';
      };
      recognizer.onerror = event => {
        if (event.error === 'aborted') resultState = '';
        else if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) resultState = 'voicePermission';
        else if (event.error === 'no-speech') resultState = 'voiceNoSpeech';
        else resultState = 'voiceError';
        onState(resultState);
      };
      recognizer.onend = () => {
        if (session === recognizer) session = null;
        onState(resultState);
      };
      session = recognizer;
      recognizer.start();
    } catch {
      session = null;
      preparing = false;
      if (!stopped) onState('voiceError');
    } finally {
      preparing = false;
    }
  }

  function stop(discard = false) {
    if (preparing) {
      stopped = true;
      onState('');
    }
    if (!session) return;
    if (discard) {
      const current = session;
      session = null;
      current.onstart = current.onspeechend = current.onresult = current.onerror = current.onend = null;
      current.abort();
      onState('');
    } else {
      session.stop();
      onState('voiceProcessing');
    }
  }

  function stopSpeech() {
    if (!speech) return;
    speech.onend = speech.onerror = null;
    speech = null;
    synthesis.cancel();
    onSpeech(null);
  }

  function speak(id, text, language) {
    if (!synthesis || !window.SpeechSynthesisUtterance) { onState('speechUnavailable'); return; }
    stopSpeech();
    const voices = synthesis.getVoices();
    const locale = language === 'te' ? 'te-IN' : 'en-IN';
    const voice = voices.find(item => item.lang.toLowerCase() === locale.toLowerCase())
      || voices.find(item => item.lang.toLowerCase().split('-')[0] === language);
    if (!voice) { onState(language === 'te' ? 'speechTeluguUnavailable' : 'speechUnavailable'); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice.lang;
    utterance.voice = voice;
    utterance.rate = 0.94;
    utterance.onend = () => { if (speech === utterance) { speech = null; onSpeech(null); } };
    utterance.onerror = () => {
      if (speech !== utterance) return;
      speech = null;
      onSpeech(null);
      onState('speechError');
    };
    speech = utterance;
    onSpeech(id);
    synthesis.speak(utterance);
  }

  return { start, stop, speak, stopSpeech, isRecording: () => Boolean(session || (preparing && !stopped)) };
}
