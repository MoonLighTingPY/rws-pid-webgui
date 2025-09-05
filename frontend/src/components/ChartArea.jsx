import { useEffect, useState, useCallback } from 'react'
import {
  Box,
  HStack,
  VStack,
  Select,
  Button,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text,
  useToast
} from '@chakra-ui/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useStore } from '../store'
import { apiService } from '../services/apiService.js'

export default function ChartArea() {
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
            dispatch({
              type: 'CHART_ADD_DATA',
              payload: {
                timestamp: data.timestamp,
                setpoint: data.setpoint,
                pitch: data.pitch,
                error: data.error
              }
            })
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
  }, [state.serial.isConnected, eventSource, dispatch])

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

  // Format chart data for Recharts
  const chartData = state.chart.data.map(point => ({
    time: point.timestamp,
    setpoint: point.setpoint,
    pitch: point.pitch,
    error: point.error
  }))

  return (
    <Box>
      <VStack align="stretch" spacing={4}>
        {/* Time Window Slider */}
        <Box>
          <Text mb={2}>Time Window: {state.chart.timeWindow} seconds</Text>
          <Slider
            value={state.chart.timeWindow}
            onChange={(value) => dispatch({ type: 'CHART_SET_TIME_WINDOW', payload: value })}
            min={10}
            max={60}
            step={5}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </Box>

        <HStack align="start" spacing={4}>
          {/* Chart */}
          <Box flex="1" height="400px">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                  formatter={(value, name) => [value.toFixed(2), name]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="setpoint"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={false}
                  name="Setpoint"
                />
                <Line
                  type="monotone"
                  dataKey="pitch"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  dot={false}
                  name="Pitch"
                />
                <Line
                  type="monotone"
                  dataKey="error"
                  stroke="#ffc658"
                  strokeWidth={2}
                  dot={false}
                  name="Error"
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          {/* Serial Controls */}
          <VStack spacing={3} minW="200px">
            <Select
              placeholder="Select COM port"
              value={state.serial.selectedPort}
              onChange={(e) => dispatch({ type: 'SERIAL_SET_SELECTED_PORT', payload: e.target.value })}
              disabled={state.serial.isConnected}
            >
              {state.serial.availablePorts.map((port) => (
                <option key={port} value={port}>
                  {port}
                </option>
              ))}
            </Select>

            <Button
              colorScheme={state.serial.isConnected ? "red" : "blue"}
              onClick={handleConnect}
              width="100%"
            >
              {state.serial.isConnected ? "Disconnect" : "Connect"}
            </Button>

            <Button
              colorScheme={state.serial.isStreaming ? "red" : "green"}
              onClick={handleStartStop}
              disabled={!state.serial.isConnected}
              width="100%"
            >
              {state.serial.isStreaming ? "Stop" : "Start"}
            </Button>

            <Button onClick={loadPorts} size="sm" width="100%">
              Refresh Ports
            </Button>
          </VStack>
        </HStack>
      </VStack>
    </Box>
  )
}