import { 
  Box, 
  HStack, 
  VStack,
  Button, 
  Text, 
  Input, // Change from NumberInput to Input
  useToast,
  Divider,
  Icon
} from '@chakra-ui/react'
import { FiSettings, FiDownload, FiUpload } from 'react-icons/fi'
import { useStore } from '../store'
import { apiService } from '../services/apiService.js'
import '../styles/PIDControls.css'
import { useState, useEffect } from 'react'

export default function PIDControls() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const [pInput, setPInput] = useState(state.pid.p.toString())
  const [iInput, setIInput] = useState(state.pid.i.toString())
  const [dInput, setDInput] = useState(state.pid.d.toString())

  // Sync local input when store changes (e.g. after GET)
  useEffect(() => {
    setPInput(state.pid.p.toString())
    setIInput(state.pid.i.toString())
    setDInput(state.pid.d.toString())
  }, [state.pid.p, state.pid.i, state.pid.d])

  // Validation logic
  const validateInput = (val) => {
    // Accept partial numbers like "-", "0.", but not empty or just ".":
    if (val === "" || val === "." || val === "-.") return false
    const parsed = parseFloat(val)
    if (isNaN(parsed)) return false
    return true
  }
  const pValid = validateInput(pInput)
  const iValid = validateInput(iInput)
  const dValid = validateInput(dInput)
  const allValid = pValid && iValid && dValid

  // Handle input change with validation
  const handleInputChange = (value, setter) => {
    // Allow typing partial numbers
    if (value === "" || value === "-" || value === "." || value === "-." || /^-?\d*\.?\d*$/.test(value)) {
      setter(value)
    }
  }

  const handleInputBlur = (value, setter, type) => {
    const val = parseFloat(value)
    if (validateInput(value) && isFinite(val)) {
      dispatch({ type, payload: val })
      setter(val.toString()) // Normalize the display
    } else {
      // Reset to store value if invalid
      const storeValue = type === 'PID_SET_P' ? state.pid.p : 
                        type === 'PID_SET_I' ? state.pid.i : 
                        state.pid.d
      setter(storeValue.toString())
    }
  }

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
      // Send PID values individually with new commands
      await apiService.sendCommand(`pid set p ${state.pid.p}`)
      await apiService.sendCommand(`pid set i ${state.pid.i}`)
      await apiService.sendCommand(`pid set d ${state.pid.d}`)

      // Add console messages for sent commands
      const commands = [
        `pid set p ${state.pid.p}`,
        `pid set i ${state.pid.i}`,
        `pid set d ${state.pid.d}`
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
      await apiService.sendCommand('pid show')
      
      dispatch({
        type: 'SERIAL_ADD_CONSOLE_MESSAGE',
        payload: {
          timestamp: Date.now(),
          text: 'pid show',
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
              <Input
                value={pInput}
                onChange={(e) => handleInputChange(e.target.value, setPInput, 'PID_SET_P')}
                onBlur={(e) => handleInputBlur(e.target.value, setPInput, 'PID_SET_P')}
                textAlign="center" 
                borderColor="gray.300"
                _hover={{ borderColor: "gray.400" }}
                _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                fontSize="sm"
                size="sm"
                placeholder="0.00"
              />
              <Box minH="18px" mt={1} textAlign="center">
                {!pValid && <Text color="red.500" fontSize="xs">P value incorrect</Text>}
              </Box>
            </Box>
            <Box flex="1">
              <Text fontSize="xs" mb={1} fontWeight="medium" color="gray.500" textAlign="center">I</Text>
              <Input
                value={iInput}
                onChange={(e) => handleInputChange(e.target.value, setIInput, 'PID_SET_I')}
                onBlur={(e) => handleInputBlur(e.target.value, setIInput, 'PID_SET_I')}
                textAlign="center"
                borderColor="gray.300"
                _hover={{ borderColor: "gray.400" }}
                _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                fontSize="sm"
                size="sm"
                placeholder="0.00"
              />
              <Box minH="18px" mt={1} textAlign="center">
                {!iValid && <Text color="red.500" fontSize="xs">I value incorrect</Text>}
              </Box>
            </Box>
            <Box flex="1">
              <Text fontSize="xs" mb={1} fontWeight="medium" color="gray.500" textAlign="center">D</Text>
              <Input
                value={dInput}
                onChange={(e) => handleInputChange(e.target.value, setDInput, 'PID_SET_D')}
                onBlur={(e) => handleInputBlur(e.target.value, setDInput, 'PID_SET_D')}
                textAlign="center"
                borderColor="gray.300"
                _hover={{ borderColor: "gray.400" }}
                _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                fontSize="sm"
                size="sm"
                placeholder="0.00"
              />
              <Box minH="18px" mt={1} textAlign="center">
                {!dValid && <Text color="red.500" fontSize="xs">D value incorrect</Text>}
              </Box>
            </Box>
          </HStack>
        </VStack>
        
        {/* Action Buttons */}
        <VStack spacing={2} align="stretch" flexShrink={0}>
          <Button 
            colorScheme="blue" 
            onClick={handleSet}
            disabled={!state.serial.isConnected || !allValid}
            size="sm"
            leftIcon={<Icon as={FiUpload} boxSize={3} />}
            _hover={{
              transform: state.serial.isConnected && allValid ? "translateY(-1px)" : "none",
              boxShadow: state.serial.isConnected && allValid ? "lg" : "none"
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