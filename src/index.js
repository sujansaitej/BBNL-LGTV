import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Focus styles are defined in public/index.html via [data-focused="true"] selectors.
// No JS-injected focus CSS — prevents conflicts and blue outlines.

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);

