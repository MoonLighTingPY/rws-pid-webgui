import { useMemo, useEffect } from 'react'
import { Box, VStack, HStack, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Text } from '@chakra-ui/react'
import { useStore } from '../store'
// import CanvasToggle from './CanvasToggle'
import AngleChart from './AngleChart'
import AngleGauges from './AngleGauges'
import PIDChart from './PIDChart'
import StreamingToggle from './StreamingToggle'

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

  const handleTimeWindowChange = (value) => { dispatch({ type: 'CHART_SET_TIME_WINDOW', payload: value }) }

  return (
    <Box position="relative" p={4} bg="white" borderRadius="xl" shadow="lg" h="100%" display="flex" flexDirection="column" minW="0">
      <VStack spacing={4} h="100%" align="stretch" minW="0">
        {/* Time Window slider row (no container padding). Streaming toggle & Hz badge sit to the right */}
        <HStack spacing={3} align="stretch">
          <Box bg="gray.50" borderRadius="lg" flex="1" p={0}>
            
            {/* Slider column */}
            <Box flex="1" px={4} py={3} display="flex" alignItems="center">
              <HStack spacing={2} align="center" flex="1">
                <Text 
                  fontWeight="medium" 
                  color="gray.600" 
                  fontSize="xs"
                  minW="6rem"  // Fixed minimum width to prevent squishing
                  flexShrink={0}  // Prevent text from shrinking
                >
                  Time Window: <Text as="span" color="blue.600" fontWeight="semibold">{state.chart.timeWindow}s</Text>
                </Text>
                <Slider
                  value={state.chart.timeWindow}
                  onChange={handleTimeWindowChange}
                  min={1}
                  max={60}
                  step={1}
                  colorScheme="blue"
                  flex="1"
                >
                  <SliderTrack bg="gray.200">
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb boxSize={4} />
                </Slider>
              </HStack>
            </Box>

            {/* Streaming column - outside of slider area */}
          </Box>
          <StreamingToggle />

        </HStack>

        {/* top row: angle chart + gauges */}
        <Box flex="0.55" minH="0" display="flex" minW="0">
          <HStack spacing={3} flex="1" minH="0" minW="0" align="stretch">
            <AngleChart />
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
          <PIDChart />
        </Box>
      </VStack>
    </Box>
  )
}