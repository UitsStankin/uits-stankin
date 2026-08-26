import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { setupApi } from './app/providers/setupApi';
import './index.css';

// До первого рендера: 401 может прилететь на самом первом запросе,
// и к этому моменту api-клиент уже должен знать, куда уводить пользователя.
setupApi();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
