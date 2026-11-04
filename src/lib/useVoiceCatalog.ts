import { useEffect } from 'react';
import { fallbackVoices } from '../data/fallback';
import { fetchVoices } from '../lib/api';
import { useAppStore } from '../store/useAppStore';

export function useVoiceCatalog() {
  const applyCatalog = useAppStore((state) => state.applyCatalog);

  useEffect(() => {
    let alive = true;

    fetchVoices()
      .then((voices) => {
        if (alive) applyCatalog(voices);
      })
      .catch((error) => {
        console.warn('音色接口不可用，使用内置备用音色：', error);
        const hasStoredVoices = useAppStore.getState().voices.length > 0;
        if (alive && !hasStoredVoices) applyCatalog(fallbackVoices);
      });

    return () => {
      alive = false;
    };
  }, [applyCatalog]);
}
