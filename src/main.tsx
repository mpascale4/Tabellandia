import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { FontSizeProvider } from './contexts/FontSizeContext';
import { VoiceProvider } from './contexts/VoiceContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FontSizeProvider>
      <VoiceProvider>
        <App />
      </VoiceProvider>
    </FontSizeProvider>
  </StrictMode>,
);
