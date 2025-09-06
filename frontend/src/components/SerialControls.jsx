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
  Divider
} from '@chakra-ui/react'
import { FiWifi, FiWifiOff, FiPlay, FiPause, FiRefreshCw } from 'react-icons/fi'
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
          
          if (data.type === 'chart') {
            if (state.serial.isStreaming) {
              dispatch({
                type: 'CHART_ADD_DATA',
                payload: {
                  timestamp: data.timestamp,
                  setpoint: data.setpoint,
                  pitch: data.pitch,
                  error: data.error
                }
              })
            } else {
              // drop binary/chart data when not streaming
            }
          } else if (data.type === 'console') {
            dispatch({
              type: 'SERIAL_ADD_CONSOLE_MESSAGE',
              payload: {
                timestamp: Date.now(),
                text: data.text,
                type: 'received'
              }
            })
          }
        } catch {
          console.error('Error parsing event data')
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
  }, [state.serial.isConnected, eventSource, dispatch, state.serial.isStreaming])

  const handleConnect = async () => {
    if (state.serial.isConnected) {
      // Disconnect
      try {
        if (state.serial.isStreaming) {
          await apiService.sendCommand('gui stop')
          dispatch({ type: 'SERIAL_SET_STREAMING', payload: false })
        }
        await apiService.disconnect()
        dispatch({ type: 'SERIAL_SET_CONNECTED', payload: false })
        dispatch({ type: 'CHART_CLEAR_DATA' })
        if (eventSource) {
          eventSource.close()
          setEventSource(null)
        }
        toast({
          title: 'Disconnected',
          status: 'info',
          duration: 2000,
          isClosable: true,
        })
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to disconnect',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
      }
    } else {
      // Connect
      if (!state.serial.selectedPort) {
        toast({
          title: 'Error',
          description: 'Please select a COM port',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
        return
      }

      try {
        await apiService.connect(state.serial.selectedPort)
        dispatch({ type: 'SERIAL_SET_CONNECTED', payload: true })

        // Ensure UI streaming flag is false on connect (require user to press Start)
        dispatch({ type: 'SERIAL_SET_STREAMING', payload: false })

        toast({
          title: 'Connected',
          description: `Connected to ${state.serial.selectedPort}`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        })
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to connect to serial port',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
      }
    }
  }

  const handleStartStop = async () => {
    if (!state.serial.isConnected) {
      toast({
        title: 'Error',
        description: 'Not connected to any port',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    try {
      const command = state.serial.isStreaming ? 'gui stop' : 'gui start'
      await apiService.sendCommand(command)

      // Clear chart data when starting streaming
      if (!state.serial.isStreaming) {
        dispatch({ type: 'CHART_CLEAR_DATA' })
      }

      dispatch({ type: 'SERIAL_SET_STREAMING', payload: !state.serial.isStreaming })
      
      dispatch({
        type: 'SERIAL_ADD_CONSOLE_MESSAGE',
        payload: {
          timestamp: Date.now(),
          text: command,
          type: 'sent'
        }
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to send command',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  return (
    <Box 
      className="serial-controls" 
      p={4} 
      bg="white" 
      borderRadius="xl" 
      shadow="lg" 
      border="1px" 
      borderColor="gray.100"
      flexShrink={0}
    >
      <VStack spacing={3} align="stretch">
        <HStack justify="space-between" align="center">
          <Text fontWeight="600" fontSize="md" color="gray.700">Serial Connection</Text>
          <Icon 
            as={state.serial.isConnected ? FiWifi : FiWifiOff} 
            color={state.serial.isConnected ? "green.500" : "gray.400"}
            boxSize={4}
          />
        </HStack>

        <Divider />
        
        <VStack spacing={2} align="stretch">
          <Box>
            <Text fontSize="xs" mb={1} fontWeight="medium" color="gray.600">COM Port</Text>
            <HStack spacing={2}>
              <Select
                placeholder="Select COM port"
                value={state.serial.selectedPort}
                onChange={(e) => dispatch({ type: 'SERIAL_SET_SELECTED_PORT', payload: e.target.value })}
                disabled={state.serial.isConnected}
                bg="white"
                borderColor="gray.300"
                _hover={{ borderColor: "gray.400" }}
                _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                flex="1"
                size="sm"
              >
                {state.serial.availablePorts.map((port) => (
                  <option key={port} value={port}>
                    {port}
                  </option>
                ))}
              </Select>
              <Button 
                onClick={loadPorts} 
                size="sm" 
                variant="outline"
                minW="auto"
                px={2}
                borderColor="gray.300"
              >
                <Icon as={FiRefreshCw} boxSize={3} />
              </Button>
            </HStack>
          </Box>

          <Button
            colorScheme={state.serial.isConnected ? "red" : "blue"}
            onClick={handleConnect}
            size="sm"
            leftIcon={<Icon as={state.serial.isConnected ? FiWifiOff : FiWifi} boxSize={3} />}
            _hover={{
              transform: "translateY(-1px)",
              boxShadow: "lg"
            }}
            transition="all 0.2s"
          >
            {state.serial.isConnected ? "Disconnect" : "Connect"}
          </Button>

          <Button
            colorScheme={state.serial.isStreaming ? "orange" : "green"}
            onClick={handleStartStop}
            disabled={!state.serial.isConnected}
            size="sm"
            leftIcon={<Icon as={state.serial.isStreaming ? FiPause : FiPlay} boxSize={3} />}
            _hover={{
              transform: state.serial.isConnected ? "translateY(-1px)" : "none",
              boxShadow: state.serial.isConnected ? "lg" : "none"
            }}
            transition="all 0.2s"
          >
            {state.serial.isStreaming ? "Stop Streaming" : "Start Streaming"}
          </Button>
        </VStack>
      </VStack>
    </Box>
  )
}