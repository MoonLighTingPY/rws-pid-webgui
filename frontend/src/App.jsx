import { useStore } from './store'
import CanvasToggle from './components/CanvasToggle'
import RightPanel from './components/RightPanel'
import { Box, Container, HStack } from '@chakra-ui/react'
import ChartArea from './components/ChartArea.jsx'
import './App.css'

export default function App() {
  const { state } = useStore()
  const showPanels = !state.ui.isCanvasMode

  return (
    <Box h="100vh" bg="gray.50" overflow="hidden">
      <Container maxW="full" p={3} h="100%">
        <HStack spacing={showPanels ? 3 : 0} h="100%" align="stretch">
          {/* Left: charts - takes remaining space */}
          <Box 
            flex="1" 
            minH="0" 
            minW="0"                // allow shrink when right panel returns
            position="relative"
            pr={showPanels ? 0 : '1.5rem'} // leave room for the toggle when panels are hidden
            transition="all 300ms ease"    // animate shrink
          >
            <ChartArea />
            {/* Show toggle button only when panels are hidden */}
            {!showPanels && <CanvasToggle />}
          </Box>

          {/* Right: panels - animate width instead of conditional removal */}
          <Box 
            flexShrink={0} 
            minH="0"
            // Animate width so left side shrinks smoothly.
            w={showPanels ? "22rem" : "0"}
            minW={showPanels ? "22rem" : "0"}
            transition="width 300ms ease, min-width 300ms ease"
            overflow="visible"   // allow the toggle button to sit outside the collapsed panel
          >
            <RightPanel isOpen={showPanels} />
          </Box>
        </HStack>
      </Container>
    </Box>
  )
}