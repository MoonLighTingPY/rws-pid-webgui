import { Box, VStack } from '@chakra-ui/react'
import { IconButton } from '@chakra-ui/react'
import { FiChevronRight } from 'react-icons/fi'
import { useStore } from '../store'
import SerialControls from './SerialControls.jsx'
import PIDControls from './PIDControls.jsx'
import CommandConsole from './CommandConsole.jsx'

export default function RightPanel({ isOpen = true }) {
  const { dispatch } = useStore()

  return (
    <Box position="relative" h="100%" display="flex" flexDirection="column" minW="0">
      {/* Toggle button attached to the left edge of the panel */}
      {isOpen && (
        <IconButton
          aria-label="Hide Panels"
          icon={<FiChevronRight />}                // show ">" when panels are open
          onClick={() => dispatch({ type: 'UI_TOGGLE_CANVAS' })}
          position="absolute"
          top="1rem"
          left="0"
          transform="translateX(-100%)"              // sit exactly on the edge
          borderRadius="10px 0 0 10px"           // rounded outer (left) corners, square (right) corners
          border="1px"
          borderColor="gray.200"
          borderRight="0"                         // <-- removed right border so it touches panel cleanly
          bg="white"
          /* shadow only on the outer side (left), none on the side touching the panel */
          boxShadow="-2px 0 6px -2px rgba(0,0,0,0.28)"
          zIndex="overlay"
          size="sm"
          _hover={{ bg: 'gray.100' }}
          _active={{ bg: 'gray.200' }}
          transition="background 0.15s ease"
        />
      )}

      {/* Panel content with proper padding and background.
          We don't force minW here so parent can animate width to 0.
          Also animate opacity/translate for a smoother hide/show. */}
      <Box 
        bg="white" 
        borderRadius="xl" 
        shadow="lg"
        border="1px"
        borderColor="gray.100"
        h="100%" 
        display="flex" 
        flexDirection="column" 
        p={4}
        minH="0"
        width="28rem"
        opacity={isOpen ? 1 : 0}
        transform={isOpen ? 'translateX(0)' : 'translateX(8px)'}
        transition="opacity 220ms ease, transform 220ms ease"
        pointerEvents={isOpen ? 'auto' : 'none'}
        overflow="hidden"
      >
        <SerialControls />
        <PIDControls />
        <Box flex="1" minH="0">
          <CommandConsole />
        </Box>
      </Box>
    </Box>
  )
}