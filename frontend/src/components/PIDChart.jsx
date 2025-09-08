import { Box, Text, IconButton, Icon } from '@chakra-ui/react'
import { MdOutlineCleaningServices } from 'react-icons/md'
import { useStore } from '../store'
import { useMemo } from 'react'
import { useUPlot } from './uplot/useUPlot.js'

export default function PIDChart() {
  const { state, dispatch } = useStore()

  // Build uPlot data arrays: [x[], setpoint[], pitch[], error[]]
  const data = useMemo(() => {
    const xs = []
    const sp = []
    const pitch = []
    const err = []
    for (const p of state.chart.pidData) {
      xs.push(p.timestamp)
      sp.push(p.setpoint)
      pitch.push(p.pitch)
      err.push(p.error)
    }
    return [xs, sp, pitch, err]
  }, [state.chart.pidData])

  const { containerRef } = useUPlot({
    data,
    title: null,
    series: [
      {}, // x
      { label: 'Setpoint', stroke: '#3182ce', width: 2 },
      { label: 'Pitch', stroke: '#38a169', width: 2 },
      { label: 'Error', stroke: '#d69e2e', width: 2 },
    ],
    yRange: null,
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
        aria-label="Clear PID data"
        icon={<Icon as={MdOutlineCleaningServices} boxSize={4} />}
        size="sm"
        position="absolute"
        top="0.5rem"
        right="0.5rem"
        onClick={() => dispatch({ type: 'CHART_CLEAR_PID_DATA' })}
        bg="purple.500"
        color="white"
        _hover={{ bg: 'purple.600' }}
        borderRadius="lg"
        shadow="md"
      />
      <Text fontWeight="semibold" fontSize="xs" color="gray.500" mb={1}>
        PID Data
      </Text>
      <Box flex="1" minH="0" ref={containerRef} />
    </Box>
  )
}