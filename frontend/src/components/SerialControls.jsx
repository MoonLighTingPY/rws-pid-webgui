import { useEffect, useState, useCallback } from 'react'
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

export default function SerialControls() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const [eventSource, setEventSource] = useState(null)

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

  // Load available ports on component mount
  useEffect(() => {
    loadPorts()
  }, [loadPorts])

  // Setup EventSource for real-time data
  useEffect(() => {
    if (state.serial.isConnected && !eventSource) {
      const es = apiService.createEventSource()

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (!data.type) return
          switch (data.type) {
            case 'pid':
              if (state.serial.isStreaming) {
                dispatch({
                  type: 'CHART_ADD_PID_DATA',
                  payload: {
                    timestamp: data.timestamp,
                    setpoint: data.setpoint,
                    pitch: data.pitch,
                    error: data.error,
                  }
                })
              }
              break
            case 'angle':
              if (state.serial.isStreaming) {
                dispatch({
                  type: 'CHART_ADD_ANGLE_DATA',
                  payload: {
                    timestamp: data.timestamp,
                    pitch_angle: data.pitch_angle,
                    roll_angle: data.roll_angle,
                  }
                })
              }
              break
            case 'freq':
              dispatch({ type: 'CHART_SET_FREQUENCY', payload: data.value })
              break
            case 'console':
              dispatch({
                type: 'SERIAL_ADD_CONSOLE_MESSAGE',
                payload: { timestamp: Date.now(), text: data.text, type: 'received' }
              })
              break
            default:
              break
          }
        } catch (e) {
          console.error('Error parsing event data', e)
        }
      }

      es.onerror = () => {
        console.error('EventSource error')
        es.close()
        setEventSource(null)
      }

      setEventSource(es)
    }
    return () => {
      if (eventSource) {
        eventSource.close()
        setEventSource(null)
      }
    }
  }, [state.serial.isConnected, state.serial.isStreaming, eventSource, dispatch])

  const handleConnect = async () => {
    if (state.serial.isConnected) {
      // Disconnect
      try {
        if (state.serial.isStreaming) {
          await apiService.sendCommand('pid stream off')
          dispatch({ type: 'SERIAL_SET_STREAMING', payload: false })
        }
        await apiService.disconnect()
        dispatch({ type: 'SERIAL_SET_CONNECTED', payload: false })
        dispatch({ type: 'CHART_CLEAR_PID_DATA' })
        dispatch({ type: 'CHART_CLEAR_ANGLE_DATA' })
        dispatch({ type: 'CHART_SET_FREQUENCY', payload: 0 }) // <-- set frequency to 0
        if (eventSource) { eventSource.close(); setEventSource(null) }
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
        // Delay before sending 'pid show'
        await new Promise(resolve => setTimeout(resolve, 300))
        await apiService.sendCommand('pid show')
        dispatch({
          type: 'SERIAL_ADD_CONSOLE_MESSAGE',
          payload: {
            timestamp: Date.now(),
            text: 'pid show',
            type: 'sent'
          }
        })

        // Request Mahony config on connect
        await apiService.sendCommand('imu mahony show')
        dispatch({
          type: 'SERIAL_ADD_CONSOLE_MESSAGE',
          payload: {
            timestamp: Date.now(),
            text: 'imu mahony show',
            type: 'sent'
          }
        })

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
      minW="0"              // defensive
    >
      <VStack spacing={3} align="stretch">
        {/* Removed panel title/icon per request */}
        
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

              {/* Refresh button */}
              <Button onClick={loadPorts} size="sm" variant="outline" minW="auto" px={2} borderColor="gray.300">
                <Icon as={FiRefreshCw} boxSize={3} />
              </Button>

              {/* Connect icon button placed in same row */}
              <IconButton
                aria-label={state.serial.isConnected ? "Disconnect" : "Connect"}
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
          {/* Removed Start/Stop streaming button */}
        </VStack>
      </VStack>
    </Box>
  )
}