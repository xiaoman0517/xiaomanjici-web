import { useAppStore } from '../store/useAppStore';

const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

const audioCache = new Map<string, string>();
let audioEl: HTMLAudioElement | null = null;
let currentResolve: (() => void) | null = null;

function getAudioElement() {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'auto';
  }
  return audioEl;
}

/**
 * iOS Safari / Chrome 的自动播放限制：
 * 必须在用户手势的同步阶段先 play 一次音频元素，后续异步设置 src 才能播放。
 */
export async function primeAudio() {
  const audio = getAudioElement();
  try {
    audio.src = SILENT_WAV;
    audio.volume = 0;
    await audio.play().catch(() => undefined);
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
  } catch {
    // 忽略：没有用户手势时解锁失败，后续仍会尝试播放
  }
}

function finishCurrent() {
  const resolve = currentResolve;
  currentResolve = null;
  if (audioEl) {
    audioEl.onended = null;
    audioEl.onerror = null;
    audioEl.pause();
  }
  resolve?.();
}

export function stopAudio() {
  finishCurrent();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function pickEngine(voiceId: string) {
  const voice = useAppStore.getState().allVoices.find((item) => item.Id === voiceId);
  const engines = voice?.SupportedEngines || [];
  if (engines.includes('neural')) return 'neural';
  if (engines.includes('standard')) return 'standard';
  return 'standard';
}

async function synthesize(text: string, voiceId: string, languageCode: string) {
  const engine = pickEngine(voiceId);
  const key = `${voiceId}|${languageCode}|${engine}|${text}`;
  const cached = audioCache.get(key);
  if (cached) return cached;

  const response = await fetch('/api/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId, languageCode, engine, outputFormat: 'mp3' })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `TTS HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    audioBase64?: string;
    audioUrl?: string;
    data?: string;
    audioContent?: string;
  };
  const url = data.audioBase64
    ? `data:audio/mpeg;base64,${data.audioBase64}`
    : data.audioContent
      ? `data:audio/mpeg;base64,${data.audioContent}`
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
    const audio = getAudioElement();
    finishCurrent();
    audio.onended = null;
    audio.onerror = null;
    audio.src = url;
    audio.currentTime = 0;
    currentResolve = resolve;

    const done = () => {
      if (currentResolve === resolve) finishCurrent();
      else resolve();
    };

    audio.onended = done;
    audio.onerror = done;
    void audio.play().catch(done);
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
  await primeAudio();

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
