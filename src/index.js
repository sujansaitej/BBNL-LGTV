import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ── Global TV remote focus styles ──
// Injected once at app startup so every page benefits automatically.
// Uses a high-contrast outline so focused elements are clearly visible on TV.
const tvFocusCSS = `
  /* Remove browser default focus ring; we provide our own */
  *:focus { outline: none; }

  /* Standard focus ring for all focusable elements */
  *:focus-visible,
  [data-focused="true"],
  button:focus,
  a:focus,
  [tabindex]:focus {
    outline: 3px solid #667eea !important;
    outline-offset: 2px !important;
    box-shadow: 0 0 0 6px rgba(102, 126, 234, 0.35) !important;
  }

  /* Sidebar / nav icon buttons */
  .focusable-icon-button:focus,
  .focusable-icon-button[data-focused="true"],
  .focusable-icon-button.focused {
    background: rgba(102, 126, 234, 0.25) !important;
    outline: 3px solid #667eea !important;
    border-radius: 12px;
    transform: scale(1.12);
  }

  /* Category / filter tab buttons */
  .focusable-category-tab:focus,
  .focusable-category-tab[data-focused="true"],
  .focusable-category-tab.focused {
    outline: 3px solid #667eea !important;
    transform: scale(1.08);
  }

  /* Sidebar channel list items */
  .focusable-sidebar-item:focus,
  .focusable-sidebar-item[data-focused="true"],
  .focusable-sidebar-item.focused {
    border-color: #667eea !important;
    background: rgba(102, 126, 234, 0.2) !important;
    transform: scale(1.04);
  }

  /* Language / grid cards */
  .focusable-language-card:focus,
  .focusable-language-card[data-focused="true"],
  .focusable-language-card.focused {
    outline: 4px solid #fff !important;
    transform: translateY(-12px) scale(1.07);
    box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(255,255,255,0.4) !important;
  }

  /* Smooth transitions for all focusable elements */
  button, [tabindex], a { transition: outline 0.15s, box-shadow 0.15s, transform 0.2s, background 0.2s; }
`;

const styleEl = document.createElement('style');
styleEl.textContent = tvFocusCSS;
document.head.appendChild(styleEl);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);

