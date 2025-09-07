// filepath: frontend/src/components/PIDChart.jsx
import { Box, Text, IconButton } from '@chakra-ui/react'
import { FiTrash2 }              from 'react-icons/fi'
import { Line }                   from 'react-chartjs-2'
import { useStore }               from '../store'

export default function PIDChart({ data, options }) {
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
        aria-label="Clear PID data"
        icon={<FiTrash2 />}
        size="sm"
        position="absolute"
        top="0.5rem"
        right="0.5rem"
        onClick={() => dispatch({ type: 'CHART_CLEAR_PID_DATA' })}
      />
      <Text fontWeight="semibold" fontSize="xs" color="gray.500" mb={1}>
        PID Data
      </Text>
      <Box flex="1" minH="0">
        <Line data={data} options={options} style={{ height: '100%' }} />
      </Box>
    </Box>
  )
}