import './App.css'
import { Box, Container, Grid, GridItem } from '@chakra-ui/react'
import ChartArea from './components/ChartArea.jsx'
import PIDControls from './components/PIDControls.jsx'
import CommandConsole from './components/CommandConsole.jsx'
import SerialControls from './components/SerialControls.jsx'

function App() {
  return (
    <Box h="100vh" bg="gray.50" overflow="hidden">
      <Container maxW="full" p={3} h="100%">
        <Grid 
          templateRows="1fr auto" 
          templateColumns="3.5fr 1fr" 
          gap={3} 
          h="100%"
        >
          {/* Chart Area - Main content */}
          <GridItem rowSpan={1} colSpan={1} minH="0">
            <ChartArea />
          </GridItem>

          <GridItem rowSpan={2} colSpan={1} minH="0">
            <Box display="flex" flexDirection="column" gap={3} h="100%" minH="0">
              <SerialControls />
              <PIDControls />
              <Box flex="2" minH="0">
                <CommandConsole />
              </Box>
            </Box>
          </GridItem>

        </Grid>
      </Container>
    </Box>
  )
}

export default App