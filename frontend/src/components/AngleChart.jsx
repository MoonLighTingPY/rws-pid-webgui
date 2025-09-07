import { Box, Text, IconButton } from '@chakra-ui/react'
import { FiTrash2 }              from 'react-icons/fi'
import { Line }                   from 'react-chartjs-2'
import { useStore }               from '../store'

export default function AngleChart({ data, options }) {
  const { dispatch } = useStore()
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
        icon={<FiTrash2 />}
        size="sm"
        position="absolute"
        top="0.5rem"
        right="0.5rem"
        onClick={() => dispatch({ type: 'CHART_CLEAR_ANGLE_DATA' })}
      />
      <Text fontWeight="semibold" fontSize="xs" color="gray.500" mb={1}>
        IMU Angles
      </Text>
      {/* Constrained flex child so Chart.js can size to available height */}
      <Box flex="1" minH="0">
        <Line data={data} options={options} style={{ height: '100%' }} />
      </Box>
    </Box>
  )
}