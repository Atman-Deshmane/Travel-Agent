import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { SharedItineraryView } from './pages/SharedItineraryView.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/kodaikanal">
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/trip/:userName/:tripName" element={<SharedItineraryView />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
