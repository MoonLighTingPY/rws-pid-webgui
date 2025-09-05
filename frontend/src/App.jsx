import './App.css'
import { Box, Container, Heading, VStack } from '@chakra-ui/react'
import ChartArea from './components/ChartArea.jsx'
import PIDControls from './components/PIDControls.jsx'
import CommandConsole from './components/CommandConsole.jsx'

function App() {
  return (
    <Container maxW="6xl" py={4}>
      <VStack align="stretch" spacing={4}>
        <Heading size="md">RWS PID Web GUI</Heading>
        <ChartArea />
        <Box>
          <PIDControls />
        </Box>
        <Box>
          <CommandConsole />
        </Box>
      </VStack>
    </Container>
  )
}

export default App