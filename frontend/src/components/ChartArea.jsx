import { useMemo, useCallback } from 'react'
import {
  Box,
  VStack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text,
  HStack,
  Badge,
} from '@chakra-ui/react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { useStore } from '../store'
import '../styles/ChartArea.css'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)

// Memoized chart options with dynamic x-axis range
const createChartOptions = (latestTimestamp, timeWindow) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false, // Disable animations for performance
  elements: {
    point: {
      radius: 0, // Hide points for better performance
    },
    line: {
      tension: 0, // Straight lines, no curves
    },
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        pointStyle: 'line',
        font: {
          size: 12,
        },
      },
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      position: 'nearest',
      enabled: true,
      animation: false,
      displayColors: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: 'white',
      bodyColor: 'white',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      cornerRadius: 4,
      callbacks: {
        title: function(context) {
          if (context.length > 0) {
            const timestamp = context[0].parsed.x;
            const date = new Date(timestamp);
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            const millis = date.getMilliseconds().toString().padStart(3, '0');
            return `Time: ${minutes}:${seconds}.${millis}`;
          }
          return '';
        },
        label: function(context) {
          return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
        },
        labelColor: function(context) {
          return {
            borderColor: context.dataset.borderColor,
            backgroundColor: context.dataset.borderColor,
          };
        },
      },
      // Remove the complex external tooltip that was causing issues
      external: undefined,
    },
  },
  scales: {
    x: {
      type: 'linear',
      position: 'bottom',
      title: {
        display: true,
        text: 'Time',
        font: {
          size: 12,
        },
      },
      ticks: {
        font: {
          size: 11,
        },
        callback: function(value) {
          const date = new Date(value);
          const minutes = date.getMinutes().toString().padStart(2, '0');
          const seconds = date.getSeconds().toString().padStart(2, '0');
          const millis = date.getMilliseconds().toString().padStart(3, '0');
          return `${minutes}:${seconds}.${millis}`;
        },
      },
      grid: {
        color: '#e2e8f0',
      },
      // Set explicit min/max based on time window and latest timestamp
      min: latestTimestamp ? latestTimestamp - (timeWindow * 1000) : undefined,
      max: latestTimestamp || undefined,
    },
    y: {
      title: {
        display: true,
        text: 'Value',
        font: {
          size: 12,
        },
      },
      ticks: {
        font: {
          size: 11,
        },
      },
      grid: {
        color: '#e2e8f0',
      },
    },
  },
  interaction: {
    mode: 'index',
    intersect: false,
  },
  // Additional option to reduce re-renders
  datasets: {
    line: {
      pointHoverRadius: 0, // Disable point hover effects
    },
  },
});

export default function ChartArea() {
  const { state, dispatch } = useStore()

  const latestTimestamp = useMemo(() => {
    const lastPid = state.chart.pidData[state.chart.pidData.length - 1]
    const lastAngle = state.chart.angleData[state.chart.angleData.length - 1]
    const lastTs = Math.max(lastPid?.timestamp || 0, lastAngle?.timestamp || 0)
    return lastTs || null
  }, [state.chart.pidData, state.chart.angleData])

  const pidChartData = useMemo(() => {
    const dataArr = state.chart.pidData
    if (!dataArr.length) return { datasets: [] }
    return {
      datasets: [
        {
          label: 'Setpoint',
          data: dataArr.map(p => ({ x: p.timestamp, y: p.setpoint })),
          borderColor: '#3182ce',
          backgroundColor: 'rgba(49,130,206,0.1)',
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: 'Pitch',
          data: dataArr.map(p => ({ x: p.timestamp, y: p.pitch })),
          borderColor: '#38a169',
          backgroundColor: 'rgba(56,161,105,0.1)',
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: 'Error',
          data: dataArr.map(p => ({ x: p.timestamp, y: p.error })),
          borderColor: '#d69e2e',
          backgroundColor: 'rgba(214,158,46,0.1)',
          borderWidth: 2,
          pointRadius: 0,
        },
      ]
    }
  }, [state.chart.pidData])

  const angleChartData = useMemo(() => {
    const dataArr = state.chart.angleData
    if (!dataArr.length) return { datasets: [] }
    return {
      datasets: [
        {
          label: 'Pitch Angle',
          data: dataArr.map(p => ({ x: p.timestamp, y: p.pitch_angle })),
          borderColor: '#805ad5',
          backgroundColor: 'rgba(128,90,213,0.1)',
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: 'Roll Angle',
          data: dataArr.map(p => ({ x: p.timestamp, y: p.roll_angle })),
          borderColor: '#dd6b20',
          backgroundColor: 'rgba(221,107,32,0.1)',
          borderWidth: 2,
          pointRadius: 0,
        },
      ]
    }
  }, [state.chart.angleData])

  const chartOptions = useMemo(() => createChartOptions(latestTimestamp, state.chart.timeWindow), [latestTimestamp, state.chart.timeWindow])

  const handleTimeWindowChange = useCallback((value) => { dispatch({ type: 'CHART_SET_TIME_WINDOW', payload: value }) }, [dispatch])

  return (
    <Box 
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
      <VStack align="stretch" spacing={4} h="100%">
        
        {/* Time Window Slider */}
        <Box bg="gray.50" p={3} borderRadius="lg" flexShrink={0}>
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="medium" color="gray.600" fontSize="sm">
              Time Window: 
              <Text as="span" color="blue.600" fontWeight="semibold">
                {state.chart.timeWindow}s
              </Text>
            </Text>
            <Badge colorScheme="purple" fontSize="0.7rem">
              {state.chart.packetFrequency.toFixed(0)} Hz
            </Badge>
          </HStack>
          <Slider
            value={state.chart.timeWindow}
            onChange={handleTimeWindowChange}
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
          flex="1" 
          bg="white" 
          borderRadius="lg" 
          border="1px" 
          borderColor="gray.200"
          minH="0"
          p={3}
        >
          <Text fontWeight="semibold" fontSize="xs" color="gray.500" mb={1}>
            PID Data
          </Text>
          <Line 
            data={pidChartData} 
            options={chartOptions}
            height="100%"
          />
        </Box>
        <Box 
          flex="1" 
          bg="white" 
          borderRadius="lg" 
          border="1px" 
          borderColor="gray.200"
          minH="0"
          p={3}
        >
          <Text fontWeight="semibold" fontSize="xs" color="gray.500" mb={1}>
            IMU Angles
          </Text>
            <Line 
              data={angleChartData} 
              options={chartOptions}
              height="100%"
            />
        </Box>
      </VStack>
    </Box>
  )
}