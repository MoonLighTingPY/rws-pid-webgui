import { IconButton, Icon, useToast } from '@chakra-ui/react'
import { FiPlay, FiPause } from 'react-icons/fi'
import { useStore } from '../store'
import { apiService } from '../services/apiService.js'

export default function StreamingToggle() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const isStreaming = state.serial.isStreaming

  const handleStartStop = async () => {
    if (!state.serial.isConnected) {
      toast({ title: 'Error', description: 'Not connected to any port', status: 'error', duration: 3000, isClosable: true })
      return
    }
    try {
      const command = isStreaming ? 'pid stream off' : 'pid stream on'
      await apiService.sendCommand(command)
      if (!isStreaming) {
        dispatch({ type: 'CHART_CLEAR_PID_DATA' })
        dispatch({ type: 'CHART_CLEAR_ANGLE_DATA' })
      }
      dispatch({ type: 'SERIAL_SET_STREAMING', payload: !isStreaming })
      dispatch({ type: 'SERIAL_ADD_CONSOLE_MESSAGE', payload: { timestamp: Date.now(), text: command, type: 'sent' } })
    } catch {
      toast({ title: 'Error', description: 'Failed to send command', status: 'error', duration: 3000, isClosable: true })
    }
  }

  return (
    <IconButton
      aria-label={isStreaming ? "Pause Streaming" : "Start Streaming"}
      icon={<Icon as={isStreaming ? FiPause : FiPlay} boxSize={4} />}
      onClick={handleStartStop}
      size="md"
      bg={isStreaming ? 'red.400' : 'green.400'}
      color="white"
      _hover={{
        bg: isStreaming ? 'red.500' : 'green.500'
      }}
      borderRadius="lg"
      shadow="md"
      isDisabled={!state.serial.isConnected}
    />
  )
}