import {
  Box,
  VStack,
  HStack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text,
  Heading,
  Badge
} from '@chakra-ui/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useStore } from '../store'
import '../styles/ChartArea.css'

export default function ChartArea() {
  const { state, dispatch } = useStore()

  // Format chart data for Recharts
  const chartData = state.chart.data.map(point => ({
    time: point.timestamp,
    setpoint: point.setpoint,
    pitch: point.pitch,
    error: point.error
  }))

  // Format timestamp to mins:seconds:millis
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    const millis = date.getMilliseconds().toString().padStart(3, '0')
    return `${minutes}:${seconds}.${millis}`
  }

  return (
    <Box 
      className="chart-area" 
      p={4} 
      bg="white" 
      borderRadius="xl" 
      shadow="lg" 
      border="1px" 
      borderColor="gray.100"
      h="100%"
      display="flex"
      flexDirection="column"
    >
      <VStack align="stretch" spacing={3} h="100%">
        
        {/* Time Window Slider */}
        <Box bg="gray.50" p={3} borderRadius="lg" flexShrink={0}>
          <Text mb={2} fontWeight="medium" color="gray.600" fontSize="sm">
            Time Window: <Text as="span" color="blue.600" fontWeight="semibold">{state.chart.timeWindow}s</Text>
          </Text>
          <Slider
            value={state.chart.timeWindow}
            onChange={(value) => dispatch({ type: 'CHART_SET_TIME_WINDOW', payload: value })}
            min={10}
            max={60}
            step={5}
            colorScheme="blue"
          >
            <SliderTrack bg="gray.200">
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb boxSize={4} />
          </Slider>
        </Box>

        {/* Chart */}
        <Box 
          className="chart-container" 
          flex="1" 
          bg="white" 
          borderRadius="lg" 
          border="1px" 
          borderColor="gray.200"
          minH="0"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatTimestamp}
                stroke="#718096"
                fontSize={12}
              />
              <YAxis stroke="#718096" fontSize={12} />
              <Tooltip
                labelFormatter={formatTimestamp}
                formatter={(value, name) => [value.toFixed(2), name]}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="setpoint"
                stroke="#3182ce"
                strokeWidth={2}
                dot={false}
                name="Setpoint"
              />
              <Line
                type="monotone"
                dataKey="pitch"
                stroke="#38a169"
                strokeWidth={2}
                dot={false}
                name="Pitch"
              />
              <Line
                type="monotone"
                dataKey="error"
                stroke="#d69e2e"
                strokeWidth={2}
                dot={false}
                name="Error"
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </VStack>
    </Box>
  )
}