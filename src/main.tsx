import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { primeAudio, primeSpeechSynthesis } from './lib/audio';
import './index.css';

primeSpeechSynthesis();

// 首次点击时解锁音频元素，避免 iOS Safari / Chrome 的自动播放限制
document.addEventListener('pointerdown', () => void primeAudio(), { once: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
