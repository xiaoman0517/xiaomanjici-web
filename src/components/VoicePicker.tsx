import { Languages, Volume2 } from 'lucide-react';
import { playText, stopAudio } from '../lib/audio';
import { useAppStore } from '../store/useAppStore';
import { useToast } from './Toast';

const samples: Record<string, string> = {
  'en-US': 'Hello, welcome to Xiaoman Vocabulary.',
  'en-GB': 'Hello, welcome to Xiaoman Vocabulary.',
  'fr-FR': 'Bonjour, bienvenue dans ton carnet de mots.',
  'de-DE': 'Hallo, willkommen in deinem Wortschatz.',
  'es-ES': 'Hola, bienvenido a tu cuaderno de palabras.',
  'it-IT': 'Ciao, benvenuto nel tuo quaderno di parole.',
  'ja-JP': 'こんにちは、小満単語へようこそ。',
  'ko-KR': '안녕하세요, 샤오만 단어장에 오신 것을 환영합니다.',
  'ru-RU': 'Привет, добро пожаловать в словарь.',
  'arb': 'مرحبا بكم في دفتر الكلمات.',
  'cmn-CN': '你好，欢迎来到小满记词。'
};

export function VoicePicker({ compact = false }: { compact?: boolean }) {
  const languages = useAppStore((state) => state.languages);
  const voices = useAppStore((state) => state.voices);
  const settings = useAppStore((state) => state.settings);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setVoice = useAppStore((state) => state.setVoice);
  const toast = useToast();

  const test = async () => {
    stopAudio();
    const text = samples[settings.languageCode] || 'Hello.';
    toast('正在试听音色…');
    await playText(text, settings.languageCode, settings.voiceId);
  };

  return (
    <div
      className={`grid gap-3 ${
        compact ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
      }`}
    >
      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black tracking-[0.16em] text-[#9b90a7]">
          <Languages size={13} />
          学习语言
        </span>
        <select
          className="select-field"
          value={settings.languageCode}
          onChange={(event) => {
            stopAudio();
            setLanguage(event.target.value);
          }}
        >
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black tracking-[0.16em] text-[#9b90a7]">
          <Volume2 size={13} />
          发音音色
        </span>
        <select
          className="select-field"
          value={settings.voiceId}
          onChange={(event) => {
            stopAudio();
            setVoice(event.target.value);
          }}
        >
          {voices.map((voice) => (
            <option key={voice.Id} value={voice.Id}>
              {voice.Name}
              {voice.Gender ? ` · ${voice.Gender === 'Female' ? '女声' : voice.Gender === 'Male' ? '男声' : voice.Gender}` : ''}
            </option>
          ))}
        </select>
      </label>

      {compact && (
        <div className="flex items-end">
          <button type="button" className="btn-secondary w-full" onClick={test}>
            <Volume2 size={16} />
            试听
          </button>
        </div>
      )}

      {!compact && (
        <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary" onClick={test}>
            <Volume2 size={16} />
            试听当前音色
          </button>
          <span className="text-xs font-semibold text-[#9b90a7]">
            音色接口不可用时会自动使用浏览器语音
          </span>
        </div>
      )}
    </div>
  );
}
