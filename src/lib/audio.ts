const audioCache = new Map<string, string>();
let currentAudio: HTMLAudioElement | null = null;
let currentResolve: (() => void) | null = null;

function finishCurrent() {
  const resolve = currentResolve;
  currentResolve = null;
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  resolve?.();
}

export function stopAudio() {
  finishCurrent();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

async function synthesize(text: string, voiceId: string, languageCode: string) {
  const key = `${voiceId}|${languageCode}|${text}`;
  const cached = audioCache.get(key);
  if (cached) return cached;

  const response = await fetch('/api/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId, languageCode })
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `TTS HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    audioBase64?: string;
    audioUrl?: string;
    data?: string;
  };
  const url = data.audioBase64
    ? `data:audio/mpeg;base64,${data.audioBase64}`
    : data.data
      ? `data:audio/mpeg;base64,${data.data}`
      : data.audioUrl || '';
  if (!url) throw new Error('后端未返回音频数据');
  if (audioCache.size > 120) audioCache.clear();
  audioCache.set(key, url);
  return url;
}

function playUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    stopAudio();
    const audio = new Audio(url);
    currentAudio = audio;
    currentResolve = resolve;

    const done = () => {
      if (currentAudio === audio) finishCurrent();
      else resolve();
    };

    audio.onended = done;
    audio.onerror = done;
    audio.play().catch(done);
  });
}

function speakFallback(text: string, languageCode: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCode || 'en-US';
    utterance.rate = 0.88;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const matched = voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(languageCode.toLowerCase().split('-')[0])
    );
    if (matched) utterance.voice = matched;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export async function playText(text: string, languageCode: string, voiceId: string): Promise<void> {
  const value = text.trim();
  if (!value) return;
  stopAudio();
  if (voiceId && languageCode) {
    try {
      const url = await synthesize(value, voiceId, languageCode);
      await playUrl(url);
      return;
    } catch (error) {
      console.warn('Polly 播放失败，回退到浏览器语音：', error);
    }
  }
  await speakFallback(value, languageCode);
}

export function primeSpeechSynthesis() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
  }
}
