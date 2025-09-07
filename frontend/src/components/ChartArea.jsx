import { useMemo, useCallback, useEffect } from 'react'
import { Box, VStack, HStack, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Text, Badge } from '@chakra-ui/react'
import { useStore } from '../store'
// import CanvasToggle from './CanvasToggle'
import AngleChart from './AngleChart'
import AngleGauges from './AngleGauges'
import PIDChart from './PIDChart'
import { createChartOptions } from './chartOptions' // you can extract your createChartOptions

export default function ChartArea() {
  const { state, dispatch } = useStore()

  // Force Chart.js to recalc after canvas / panel toggle
  useEffect(() => {
    const fire = () => window.dispatchEvent(new Event('resize'))
    // immediate & deferred to catch transition end
    requestAnimationFrame(fire)
    const t = setTimeout(fire, 320) // slightly > transition 300ms
    return () => clearTimeout(t)
  }, [state.ui.isCanvasMode])

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
    <Box position="relative" p={4} bg="white" borderRadius="xl" shadow="lg" h="100%" display="flex" flexDirection="column" minW="0">
      <VStack spacing={4} h="100%" align="stretch" minW="0">
        {/* Time Window Slider */}
        <Box bg="gray.50" p={3} borderRadius="lg" flexShrink={0}>
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="medium" color="gray.600" fontSize="sm">
              Time Window: <Text as="span" color="blue.600" fontWeight="semibold">{state.chart.timeWindow}s</Text>
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

        {/* top row: angle chart + gauges */}
        <Box flex="0.55" minH="0" display="flex" minW="0">
          <HStack spacing={3} flex="1" minH="0" minW="0" align="stretch">
            <AngleChart data={angleChartData} options={chartOptions} />
            <VStack
              spacing={{ base: '0.6rem', md: '0.75rem' }}
              p={{ base: 2, md: 3 }}
              bg="white"
              borderRadius="lg"
              border="1px"
              borderColor="gray.200"
              h="100%"
              minH="0"
              flex="0 1 auto"
              align="stretch"
              justify="center"
              minW="0"
            >
              <AngleGauges />
            </VStack>
          </HStack>
        </Box>

        {/* bottom: PID chart */}
        <Box flex="1" minH="0" minW="0" display="flex">
          <PIDChart data={pidChartData} options={chartOptions} />
        </Box>
      </VStack>
    </Box>
  )
}