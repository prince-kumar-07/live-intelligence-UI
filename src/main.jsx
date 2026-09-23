import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { CountryProvider } from './Context/countryContext.jsx'

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CountryProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    </CountryProvider>
  </StrictMode>,
);
