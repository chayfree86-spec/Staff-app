import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AlertConfirmProvider } from './components/ui/AlertConfirmProvider'

// Global override for native dialogs to prevent their usage
if (typeof window !== 'undefined') {
  window.alert = (message?: any) => {
    console.warn('Native alert() is disabled. Use useAlertConfirm() context instead.', message);
  };
  window.confirm = (message?: string) => {
    console.warn('Native confirm() is disabled. Use useAlertConfirm() context instead.', message);
    return false;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlertConfirmProvider>
      <App />
    </AlertConfirmProvider>
  </StrictMode>,
)
