import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import './index.css'
import App from './App.jsx'
import { StoreProvider } from './store/index.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChakraProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </ChakraProvider>
  </StrictMode>,
)