import { useEffect, useCallback, useRef } from 'react'
import {
  Box,
  VStack,
  Select,
  Button,
  Text,
  useToast,
  HStack,
  Icon,
  Divider,
  IconButton
} from '@chakra-ui/react'
import { FiLogIn, FiLogOut, FiRefreshCw } from 'react-icons/fi'
import { useStore } from '../store'
import { apiService } from '../services/apiService.js'
import '../styles/SerialControls.css'
import { useTelemetry } from '../services/telemetryService.js'  // <-- added

export default function SerialControls() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const sentInitialRef = useRef(false)

  const loadPorts = useCallback(async () => {
    try {
      const result = await apiService.getPorts()
      dispatch({ type: 'SERIAL_SET_PORTS', payload: result.ports })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load COM ports',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }, [dispatch, toast])

  // Send initial commands
  const sendInitialCommands = useCallback(async () => {
    if (!sentInitialRef.current && state.serial.isConnected) {
      try {
        // Wait longer for serial backend and simulator to fully initialize
        await new Promise((r) => setTimeout(r, 500))
        
        // Send a simple test command first to "wake up" the simulator
        await apiService.sendCommand('help')
        await new Promise((r) => setTimeout(r, 200))
        
        // Now send the actual initial commands
        await apiService.sendCommand('pid show')
        dispatch({
          type: 'SERIAL_ADD_CONSOLE_MESSAGE',
          payload: { timestamp: Date.now(), text: 'pid show', type: 'sent' }
        })
        
        await new Promise((r) => setTimeout(r, 100))
        
        await apiService.sendCommand('imu mahony show')
        dispatch({
          type: 'SERIAL_ADD_CONSOLE_MESSAGE',
          payload: { timestamp: Date.now(), text: 'imu mahony show', type: 'sent' }
        })
        
        sentInitialRef.current = true
      } catch (e) {
        console.error('Error sending initial commands', e)
      }
    }
  }, [state.serial.isConnected, dispatch])

  // Load available ports on component mount
  useEffect(() => {
    loadPorts()
  }, [loadPorts])

  // Send initial commands when connected
  useEffect(() => {
    if (state.serial.isConnected) {
      sendInitialCommands()
    } else {
      sentInitialRef.current = false
    }
  }, [state.serial.isConnected, sendInitialCommands])

  // Bind telemetry lifecycle to connection + streaming
  useTelemetry(state.serial.isConnected, state.serial.isStreaming, dispatch)

  const handleConnect = async () => {
    if (state.serial.isConnected) {
      try {
        if (state.serial.isStreaming) {
          await apiService.sendCommand('pid stream off')
          dispatch({ type: 'SERIAL_SET_STREAMING', payload: false })
        }
        await apiService.disconnect()
        dispatch({ type: 'SERIAL_SET_CONNECTED', payload: false })
        dispatch({ type: 'CHART_CLEAR_PID_DATA' })
        dispatch({ type: 'CHART_CLEAR_ANGLE_DATA' })
        dispatch({ type: 'CHART_SET_FREQUENCY', payload: 0 })
        sentInitialRef.current = false
        toast({ title: 'Disconnected', status: 'info', duration: 2000, isClosable: true })
      } catch {
        toast({ title: 'Error', description: 'Failed to disconnect', status: 'error', duration: 3000, isClosable: true })
      }
    } else {
      // Connect
      if (!state.serial.selectedPort) {
        toast({ title: 'Error', description: 'Please select a COM port', status: 'error', duration: 3000, isClosable: true })
        return
      }
      try {
        await apiService.connect(state.serial.selectedPort)
        dispatch({ type: 'SERIAL_SET_CONNECTED', payload: true })
        dispatch({ type: 'SERIAL_SET_STREAMING', payload: false })

        toast({ title: 'Connected', description: `Connected to ${state.serial.selectedPort}` , status: 'success', duration: 2000, isClosable: true })
      } catch {
        toast({ title: 'Error', description: 'Failed to connect to serial port', status: 'error', duration: 3000, isClosable: true })
      }
    }
  }

  return (
    <Box 
      className="serial-controls" 
      p={3} 
      bg="gray.50" 
      borderRadius="lg" 
      border="1px" 
      borderColor="gray.200"
      flexShrink={0}
      minW="0"
    >
      <VStack spacing={3} align="stretch">
        <VStack spacing={2} align="stretch">
          <Box>
            <HStack spacing={2}>
              <Select
                placeholder="Select COM port"
                value={state.serial.selectedPort}
                onChange={(e) => dispatch({ type: 'SERIAL_SET_SELECTED_PORT', payload: e.target.value })}
                disabled={state.serial.isConnected}
                bg="white"
                borderColor="gray.300"
                _hover={{ borderColor: 'gray.400' }}
                _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3182ce' }}
                flex="1"
                size="sm"
              >
                {state.serial.availablePorts.map(port => <option key={port} value={port}>{port}</option>)}
              </Select>

              <Button onClick={loadPorts} size="sm" variant="outline" minW="auto" px={2} borderColor="gray.300">
                <Icon as={FiRefreshCw} boxSize={3} />
              </Button>

              <IconButton
                aria-label={state.serial.isConnected ? 'Disconnect' : 'Connect'}
                onClick={handleConnect}
                size="sm"
                icon={<Icon as={state.serial.isConnected ? FiLogOut : FiLogIn} boxSize={3} />}
                bg={state.serial.isConnected ? 'red.400' : 'green.400'}
                _hover={{
                  bg: state.serial.isConnected ? 'red.500' : 'green.500'
                }}
                isDisabled={!state.serial.selectedPort && !state.serial.isConnected}
                variant="outline"
                minW="auto"
                px={2}
                borderColor="gray.300"
              />
            </HStack>
          </Box>
        </VStack>
      </VStack>
    </Box>
  )
}