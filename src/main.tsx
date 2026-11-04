import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { primeSpeechSynthesis } from './lib/audio';
import './index.css';

primeSpeechSynthesis();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
