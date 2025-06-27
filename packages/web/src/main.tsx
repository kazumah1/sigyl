import { Buffer } from 'buffer'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Polyfill Buffer for gray-matter
window.Buffer = Buffer

createRoot(document.getElementById("root")!).render(<App />);
