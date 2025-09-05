import { 
  Box, 
  HStack, 
  Input, 
  Button, 
  Text, 
  NumberInput,
  NumberInputField,
  useToast
} from '@chakra-ui/react'
import { useStore } from '../store'
import { apiService } from '../services/apiService.js'

export default function PIDControls() {
  const { state, dispatch } = useStore()
  const toast = useToast()

  const handleSet = async () => {
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
      // Send PID values individually
      await apiService.sendCommand(`pid p ${state.pid.p}`)
      await apiService.sendCommand(`pid i ${state.pid.i}`)
      await apiService.sendCommand(`pid d ${state.pid.d}`)

      // Add console messages for sent commands
      const commands = [
        `pid p ${state.pid.p}`,
        `pid i ${state.pid.i}`,
        `pid d ${state.pid.d}`
      ]
      
      commands.forEach(cmd => {
        dispatch({
          type: 'SERIAL_ADD_CONSOLE_MESSAGE',
          payload: {
            timestamp: Date.now(),
            text: cmd,
            type: 'sent'
          }
        })
      })

      toast({
        title: 'PID Values Set',
        status: 'success',
        duration: 2000,
        isClosable: true,
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to set PID values',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const handleGet = async () => {
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
      await apiService.sendCommand('pid')
      
      dispatch({
        type: 'SERIAL_ADD_CONSOLE_MESSAGE',
        payload: {
          timestamp: Date.now(),
          text: 'pid',
          type: 'sent'
        }
      })

      toast({
        title: 'PID Values Requested',
        description: 'Check console for response',
        status: 'info',
        duration: 2000,
        isClosable: true,
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to request PID values',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  return (
    <Box p={4} border="1px" borderColor="gray.200" borderRadius="md">
      <Text mb={3} fontWeight="semibold">PID Controls</Text>
      <HStack spacing={4}>
        <Box>
          <Text fontSize="sm" mb={1}>P</Text>
          <NumberInput
            value={state.pid.p}
            onChange={(valueString) => 
              dispatch({ type: 'PID_SET_P', payload: parseFloat(valueString) || 0 })
            }
            precision={2}
            step={0.1}
            width="100px"
          >
            <NumberInputField />
          </NumberInput>
        </Box>
        
        <Box>
          <Text fontSize="sm" mb={1}>I</Text>
          <NumberInput
            value={state.pid.i}
            onChange={(valueString) => 
              dispatch({ type: 'PID_SET_I', payload: parseFloat(valueString) || 0 })
            }
            precision={2}
            step={0.1}
            width="100px"
          >
            <NumberInputField />
          </NumberInput>
        </Box>
        
        <Box>
          <Text fontSize="sm" mb={1}>D</Text>
          <NumberInput
            value={state.pid.d}
            onChange={(valueString) => 
              dispatch({ type: 'PID_SET_D', payload: parseFloat(valueString) || 0 })
            }
            precision={2}
            step={0.1}
            width="100px"
          >
            <NumberInputField />
          </NumberInput>
        </Box>
        
        <Box>
          <Text fontSize="sm" mb={1} opacity={0}>Actions</Text>
          <HStack>
            <Button 
              colorScheme="blue" 
              size="sm" 
              onClick={handleSet}
              disabled={!state.serial.isConnected}
            >
              Set
            </Button>
            <Button 
              colorScheme="green" 
              size="sm" 
              onClick={handleGet}
              disabled={!state.serial.isConnected}
            >
              Get
            </Button>
          </HStack>
        </Box>
      </HStack>
    </Box>
  )
}