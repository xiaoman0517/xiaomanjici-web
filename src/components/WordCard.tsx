import { Lightbulb, Sparkles, Volume2 } from 'lucide-react';
import type { Word } from '../types';

export function WordCard({
  word,
  playingWord,
  playingExample,
  onPlayWord,
  onPlayExample
}: {
  word: Word;
  playingWord?: boolean;
  playingExample?: boolean;
  onPlayWord?: () => void;
  onPlayExample?: () => void;
}) {
  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft backdrop-blur-2xl md:p-8">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-sakura/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-sky/20 blur-2xl" />
      <div className="absolute right-5 top-5 rotate-6 rounded-full bg-lemon/70 px-2.5 py-1 text-[10px] font-black tracking-wide text-[#7b5c00] shadow-sm">
        <Sparkles className="mr-1 inline" size={11} />
        WORD CARD
      </div>

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="break-words font-display text-4xl font-black tracking-tight text-[#3f3a4f] md:text-5xl">
              {word.word}
            </h2>
            {word.phonetic && (
              <p className="mt-2 font-display text-base font-bold tracking-wide text-[#9a8fa6] md:text-lg">
                {word.phonetic}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onPlayWord}
            className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-full text-white shadow-[0_14px_30px_-14px_rgba(242,111,153,0.9)] transition ${
              playingWord ? 'bg-gradient-to-br from-grape to-sky' : 'bg-gradient-to-br from-sakura to-[#f26f99]'
            }`}
            aria-label="播放单词发音"
          >
            {playingWord && <span className="pulse-ring absolute inset-0 rounded-full bg-sakura/50" />}
            <Volume2 size={22} className="relative" />
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-[#f3e5ec] bg-[#fffafc] p-4 md:p-5">
          <p className="text-[11px] font-black tracking-[0.18em] text-[#c3a9b8]">释义</p>
          <p className="mt-1.5 text-lg font-bold leading-relaxed text-[#4b4459] md:text-xl">
            {word.definition || '暂无释义'}
          </p>
        </div>

        {word.example && (
          <div className="mt-4 rounded-2xl border border-sky/20 bg-sky/5 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[11px] font-black tracking-[0.18em] text-[#7aa8c2]">
                <Lightbulb size={13} />
                例句
              </p>
              <button
                type="button"
                onClick={onPlayExample}
                className={`flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-extrabold text-[#5d8fa9] ring-1 ring-sky/20 transition hover:bg-white ${
                  playingExample ? 'opacity-70' : ''
                }`}
              >
                <Volume2 size={14} />
                {playingExample ? '播放中' : '播放'}
              </button>
            </div>
            <p className="mt-2 text-base font-semibold leading-relaxed text-[#435265] md:text-lg">{word.example}</p>
            {word.exampleTranslation && (
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-[#8395a5]">{word.exampleTranslation}</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
