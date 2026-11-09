import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoice } from '../public/voice.js';

function harness(browser, onTranscript) {
  globalThis.window = browser;
  const states = [], texts = [], playing = [];
  const voice = createVoice({
    onState: value => states.push(value),
    onTranscript: value => { texts.push(value); return onTranscript?.(value); },
    onSpeech: value => playing.push(value),
  });
  return { voice, states, texts, playing };
}

test('unsupported voice gives a text fallback', async () => {
  const { voice, states } = harness({});
  await voice.start('te');
  assert.deepEqual(states, ['voiceUnavailable']);
  assert.equal(voice.isRecording(), false);
});

test('on-device recognition sets locale, processes, stops and passes editable text', async () => {
  let recognition;
  class Recognition {
    static async available({ langs, processLocally }) {
      assert.deepEqual(langs, ['te-IN']);
      assert.equal(processLocally, true);
      return 'available';
    }
    constructor() { this.processLocally = false; recognition = this; }
    start() { this.onstart(); }
    stop() { this.onspeechend(); }
    abort() {}
  }
  const { voice, states, texts } = harness({ SpeechRecognition: Recognition });
  await voice.start('te');
  assert.equal(recognition.lang, 'te-IN');
  assert.equal(recognition.processLocally, true);
  assert.equal(voice.isRecording(), true);
  voice.stop();
  recognition.onresult({ resultIndex: 0, results: [[{ transcript: 'పీఎం కిసాన్' }]] });
  recognition.onend();
  assert.deepEqual(texts, ['పీఎం కిసాన్']);
  assert.deepEqual(states.slice(-3), ['voiceProcessing', 'voiceProcessing', 'voiceReady']);
  assert.equal(voice.isRecording(), false);
});

test('missing pack and microphone denial keep recording inactive', async () => {
  let recognizer;
  class Recognition {
    static status = 'downloadable';
    static async available() { return this.status; }
    constructor() { this.processLocally = false; recognizer = this; }
    start() { this.onstart(); }
  }
  const { voice, states } = harness({ SpeechRecognition: Recognition });
  await voice.start('te');
  assert.equal(states.at(-1), 'voicePack');
  assert.equal(voice.isRecording(), false);
  Recognition.status = 'available';
  await voice.start('en');
  recognizer.onerror({ error: 'not-allowed' });
  recognizer.onend();
  assert.equal(states.at(-1), 'voicePermission');
  assert.equal(voice.isRecording(), false);
});

test('speech picks a language-matching voice, can stop, and reports missing Telugu voice', () => {
  let current, cancelled = 0;
  class Utterance { constructor(text) { this.text = text; } }
  globalThis.SpeechSynthesisUtterance = Utterance;
  const { voice, states, playing } = harness({
    SpeechSynthesisUtterance: Utterance,
    speechSynthesis: {
      getVoices: () => [{ lang: 'en-IN' }],
      speak: utterance => { current = utterance; },
      cancel: () => { cancelled++; },
    },
  });
  voice.speak(7, 'Namaste', 'en');
  assert.equal(current.lang, 'en-IN');
  assert.equal(current.text, 'Namaste');
  voice.stopSpeech();
  assert.equal(cancelled, 1);
  assert.deepEqual(playing, [7, null]);
  voice.speak(8, 'నమస్కారం', 'te');
  assert.equal(states.at(-1), 'speechTeluguUnavailable');
});
