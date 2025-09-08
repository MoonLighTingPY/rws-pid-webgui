import { Box, Text, IconButton, Icon } from '@chakra-ui/react'
import { MdOutlineCleaningServices } from 'react-icons/md'
import { useStore } from '../store'
import { useMemo } from 'react'
import { useUPlot } from './uplot/useUPlot.js'

export default function AngleChart() {
  const { state, dispatch } = useStore()

  const data = useMemo(() => {
    const xs = []
    const pitchA = []
    const rollA = []
    for (const a of state.chart.angleData) {
      xs.push(a.timestamp)
      pitchA.push(a.pitch_angle)
      rollA.push(a.roll_angle)
    }
    return [xs, pitchA, rollA]
  }, [state.chart.angleData])

  const { containerRef } = useUPlot({
    data,
    title: null,
    series: [
      {},
      { label: 'Pitch Angle', stroke: '#805ad5', width: 2 },
      { label: 'Roll Angle', stroke: '#dd6b20', width: 2 },
    ],
    yRange: [-180, 180],
  })

  return (
    <Box
      position="relative"
      flex="1"
      p={3}
      minW="0"
      bg="white"
      borderRadius="lg"
      border="1px"
      borderColor="gray.200"
      minH="0"
      display="flex"
      flexDirection="column"
    >
      <IconButton
        aria-label="Clear angle data"
        icon={<Icon as={MdOutlineCleaningServices} boxSize={4} />}
        size="sm"
        position="absolute"
        top="0.5rem"
        right="0.5rem"
        onClick={() => dispatch({ type: 'CHART_CLEAR_ANGLE_DATA' })}
        bg="purple.500"
        color="white"
        _hover={{ bg: 'purple.600' }}
        borderRadius="lg"
        shadow="md"
      />
      <Text fontWeight="semibold" fontSize="xs" color="gray.500" mb={1}>
        IMU Angles
      </Text>
      <Box flex="1" minH="0" ref={containerRef} />
    </Box>
  )
}