import { IconButton } from '@chakra-ui/react'
import { FiChevronLeft } from 'react-icons/fi'
import { useStore } from '../store'

export default function CanvasToggle() {
  const { dispatch } = useStore()
  return (
    <IconButton
      aria-label="Show Panels"
      icon={<FiChevronLeft />}           // show "<" when panels are hidden
      onClick={() => dispatch({ type: 'UI_TOGGLE_CANVAS' })}
      position="absolute"
      top="1rem"
      right="-1rem"               // moved outside of ChartArea padding
      borderRadius="lg"
      bg="white"
      boxShadow="lg"
      zIndex="overlay"
      size="sm"
      _hover={{ bg: 'gray.100' }}
    />
  )
}