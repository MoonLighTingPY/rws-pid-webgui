import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider } from "@chakra-ui/react"
import './index.css'
import App from './App.jsx'
import { StoreProvider } from './store/index.js'

// Register Chart.js components once for react-chartjs-2
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ChakraProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </ChakraProvider>
  </StrictMode>,
)