import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initTheme } from './lib/theme/themes';

// Apply saved GL theme before first paint to avoid a flash of default colors.
initTheme();

const container = document.getElementById('root')!;
// Drop the static SEO/no-JS shell in index.html before React takes over.
container.replaceChildren();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
