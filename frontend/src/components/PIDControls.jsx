import { 
  Box, 
  HStack, 
  VStack,
  Button, 
  Text, 
  NumberInput,
  NumberInputField,
  useToast,
  Divider,
  Icon
} from '@chakra-ui/react'
import { FiSettings, FiDownload, FiUpload } from 'react-icons/fi'
import { useStore } from '../store'
import { apiService } from '../services/apiService.js'
import '../styles/PIDControls.css'

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
    <Box 
      className="pid-controls" 
      p={4} 
      bg="white" 
      borderRadius="xl" 
      shadow="lg" 
      border="1px" 
      borderColor="gray.100"
      flexShrink={0}
    >
      <VStack spacing={3} align="stretch" h="100%">
        <HStack justify="space-between" align="center" flexShrink={0}>
          <Text fontWeight="600" fontSize="md" color="gray.700">PID Coefficients</Text>
          <Icon as={FiSettings} color="gray.500" boxSize={4} />
        </HStack>

        <Divider />
        
        {/* PID Input Fields in a row */}
        <VStack spacing={2} align="stretch" flex="1">
          <HStack spacing={2}>
            <Box flex="1">
              <Text fontSize="xs" mb={1} fontWeight="medium" color="gray.500" textAlign="center">P</Text>
              <NumberInput
                value={state.pid.p}
                onChange={(valueString) => 
                  dispatch({ type: 'PID_SET_P', payload: parseFloat(valueString) || 0 })
                }
                precision={2}
                step={0.1}
                size="sm"
              >
                <NumberInputField 
                  textAlign="center" 
                  borderColor="gray.300"
                  _hover={{ borderColor: "gray.400" }}
                  _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                  fontSize="sm"
                />
              </NumberInput>
            </Box>
            
            <Box flex="1">
              <Text fontSize="xs" mb={1} fontWeight="medium" color="gray.500" textAlign="center">I</Text>
              <NumberInput
                value={state.pid.i}
                onChange={(valueString) => 
                  dispatch({ type: 'PID_SET_I', payload: parseFloat(valueString) || 0 })
                }
                precision={2}
                step={0.1}
                size="sm"
              >
                <NumberInputField 
                  textAlign="center"
                  borderColor="gray.300"
                  _hover={{ borderColor: "gray.400" }}
                  _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                  fontSize="sm"
                />
              </NumberInput>
            </Box>
            
            <Box flex="1">
              <Text fontSize="xs" mb={1} fontWeight="medium" color="gray.500" textAlign="center">D</Text>
              <NumberInput
                value={state.pid.d}
                onChange={(valueString) => 
                  dispatch({ type: 'PID_SET_D', payload: parseFloat(valueString) || 0 })
                }
                precision={2}
                step={0.1}
                size="sm"
              >
                <NumberInputField 
                  textAlign="center"
                  borderColor="gray.300"
                  _hover={{ borderColor: "gray.400" }}
                  _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                  fontSize="sm"
                />
              </NumberInput>
            </Box>
          </HStack>
        </VStack>
        
        {/* Action Buttons */}
        <VStack spacing={2} align="stretch" flexShrink={0}>
          <Button 
            colorScheme="blue" 
            onClick={handleSet}
            disabled={!state.serial.isConnected}
            size="sm"
            leftIcon={<Icon as={FiUpload} boxSize={3} />}
            _hover={{
              transform: state.serial.isConnected ? "translateY(-1px)" : "none",
              boxShadow: state.serial.isConnected ? "lg" : "none"
            }}
            transition="all 0.2s"
          >
            Set Values
          </Button>
          <Button 
            colorScheme="green" 
            onClick={handleGet}
            disabled={!state.serial.isConnected}
            size="sm"
            variant="outline"
            leftIcon={<Icon as={FiDownload} boxSize={3} />}
            _hover={{
              transform: state.serial.isConnected ? "translateY(-1px)" : "none",
              boxShadow: state.serial.isConnected ? "md" : "none"
            }}
            transition="all 0.2s"
          >
            Get Values
          </Button>
        </VStack>
      </VStack>
    </Box>
  )
}