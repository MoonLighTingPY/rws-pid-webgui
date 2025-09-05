import './App.css'
import { Box, Container, Grid, GridItem } from '@chakra-ui/react'
import ChartArea from './components/ChartArea.jsx'
import PIDControls from './components/PIDControls.jsx'
import CommandConsole from './components/CommandConsole.jsx'
import SerialControls from './components/SerialControls.jsx'

function App() {
  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="full" p={4}>
        <Grid 
          templateRows="auto 1fr auto" 
          templateColumns="1fr 320px" 
          gap={4} 
          minH="calc(100vh - 2rem)"
        >
          {/* Chart Area - Main content */}
          <GridItem rowSpan={1} colSpan={1}>
            <ChartArea />
          </GridItem>

          {/* Serial and PID Controls - Right sidebar */}
          <GridItem rowSpan={1} colSpan={1}>
            <Box display="flex" flexDirection="column" gap={4} height="100%">
              <SerialControls />
              <PIDControls />
            </Box>
          </GridItem>

          {/* Command Console - Bottom spanning both columns */}
          <GridItem rowSpan={1} colSpan={2}>
            <CommandConsole />
          </GridItem>
        </Grid>
      </Container>
    </Box>
  )
}

export default App