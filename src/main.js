import './ui/styles.css';
import { createShell } from './ui/shell.js';

const appRoot = document.getElementById('app');
if (appRoot) {
  window.__atelie = createShell(appRoot, {
    onAction(action) {
      // Shell actions hook
    }
  });
}
