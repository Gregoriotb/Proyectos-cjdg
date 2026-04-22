import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { WebSocketProvider } from './context/WebSocketContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <WebSocketProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </WebSocketProvider>
    </AuthProvider>
  </React.StrictMode>,
)
