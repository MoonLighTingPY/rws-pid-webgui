import {
  Box,
  HStack,
  VStack,
  Text,
  Input,
  useToast,
  Icon,
  IconButton
} from '@chakra-ui/react'
import { FiRefreshCw, FiPlus, FiMinus } from 'react-icons/fi'
import { useStore } from '../store'
import { apiService } from '../services/apiService.js'
import { useState, useEffect } from 'react'

export default function ImuOffsetControls() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const [xInput, setXInput] = useState((state.imuOffset?.x ?? 0).toFixed(1))
  const [yInput, setYInput] = useState((state.imuOffset?.y ?? 0).toFixed(1))
  const [zInput, setZInput] = useState((state.imuOffset?.z ?? 0).toFixed(1))
  // New: State for step input
  const [stepInput, setStepInput] = useState((state.imuOffset?.step ?? 0.10).toFixed(2))

  // Sync from store when values change
  useEffect(() => {
    setXInput((state.imuOffset?.x ?? 0).toFixed(1))
    setYInput((state.imuOffset?.y ?? 0).toFixed(1))
    setZInput((state.imuOffset?.z ?? 0).toFixed(1))
    // New: Sync step input
    setStepInput((state.imuOffset?.step ?? 0.10).toFixed(2))
  }, [state.imuOffset?.x, state.imuOffset?.y, state.imuOffset?.z, state.imuOffset?.step])

  const validateInput = (val) => {
    if (val === '' || val === '.' || val === '-.') return false
    const parsed = parseFloat(val)
    if (isNaN(parsed)) return false
    return true
  }

  // New: Validation for step (must be positive)
  const validateStepInput = (val) => {
    if (!validateInput(val)) return false
    const parsed = parseFloat(val)
    return parsed > 0
  }

  const handleInputChange = (value, setter) => {
    if (value === '' || value === '-' || value === '.' || value === '-.' || /^-?\d*\.?\d*$/.test(value)) {
      setter(value)
    }
  }

  const handleInputBlur = (value, setter, actionType) => {
    const val = parseFloat(value)
    if (validateInput(value) && isFinite(val)) {
      // normalize to 1 decimal place for store + display
      const rounded = parseFloat(val.toFixed(1))
      dispatch({ type: actionType, payload: rounded })
      setter(rounded.toFixed(1))
    } else {
      // reset from store
      let storeValue = 0
      if (actionType === 'IMU_OFFSET_SET_X') storeValue = state.imuOffset?.x ?? 0
      else if (actionType === 'IMU_OFFSET_SET_Y') storeValue = state.imuOffset?.y ?? 0
      else if (actionType === 'IMU_OFFSET_SET_Z') storeValue = state.imuOffset?.z ?? 0
      setter(storeValue.toFixed(1))
    }
  }

  // New: Handler for step input blur
  const handleStepInputBlur = (value) => {
    const val = parseFloat(value)
    if (validateStepInput(value) && isFinite(val)) {
      const rounded = parseFloat(val.toFixed(2))
      dispatch({ type: 'IMU_OFFSET_SET_STEP', payload: rounded })
      setStepInput(rounded.toFixed(2))
    } else {
      // Reset to store value
      const storeValue = state.imuOffset?.step ?? 0.10
      setStepInput(storeValue.toFixed(2))
    }
  }

  const handleStepChange = async (axis, direction) => {
    if (!state.serial.isConnected) {
      toast({ title: 'Error', description: 'Not connected to any port', status: 'error', duration: 3000, isClosable: true })
      return
    }

    // read step from store (now editable via UI)
    const step = parseFloat(state.imuOffset?.step ?? 0.10)
    if (!isFinite(step) || step <= 0) {
      toast({ title: 'Error', description: 'Invalid step value in store', status: 'error', duration: 3000, isClosable: true })
      return
    }

    let currentValue = 0
    if (axis === 'x') currentValue = state.imuOffset?.x ?? 0
    else if (axis === 'y') currentValue = state.imuOffset?.y ?? 0
    else if (axis === 'z') currentValue = state.imuOffset?.z ?? 0

    const newValue = direction === 'plus' ? currentValue + step : currentValue - step

    try {
      // send with 1 decimal precision
      const cmdVal = newValue.toFixed(1)
      await apiService.sendCommand(`imu offset set ${axis} ${cmdVal}`)
      dispatch({
        type: 'SERIAL_ADD_CONSOLE_MESSAGE',
        payload: { timestamp: Date.now(), text: `imu offset set ${axis} ${cmdVal}`, type: 'sent' }
      })

      // Update store immediately
      const actionType = axis === 'x' ? 'IMU_OFFSET_SET_X' : axis === 'y' ? 'IMU_OFFSET_SET_Y' : 'IMU_OFFSET_SET_Z'
      dispatch({ type: actionType, payload: parseFloat(newValue.toFixed(1)) })

    } catch {
      toast({ title: 'Error', description: 'Failed to set IMU offset', status: 'error', duration: 3000, isClosable: true })
    }
  }

  const handleGet = async () => {
    if (!state.serial.isConnected) {
      toast({ title: 'Error', description: 'Not connected to any port', status: 'error', duration: 3000, isClosable: true })
      return
    }
    try {
      await apiService.sendCommand('imu offset show')
      dispatch({
        type: 'SERIAL_ADD_CONSOLE_MESSAGE',
        payload: { timestamp: Date.now(), text: 'imu offset show', type: 'sent' }
      })
      toast({ title: 'IMU Offset Values Requested', description: 'Check console for response', status: 'info', duration: 2000, isClosable: true })
    } catch {
      toast({ title: 'Error', description: 'Failed to request IMU offset values', status: 'error', duration: 3000, isClosable: true })
    }
  }

  return (
    <Box
      p={3}
      bg="gray.50"
      borderRadius="lg"
      border="1px"
      borderColor="gray.200"
      flexShrink={0}
      minW="0"
    >
      <VStack spacing={2} align="stretch" h="100%">
        {/* Modified: Label row now includes step input inline */}
        <HStack spacing={2} align="center" justify="space-between">
          <Text fontSize="xs" fontWeight="medium">IMU Offsets</Text>
          <HStack spacing={1} align="center">
            <Text fontSize="xs" color="gray.500">Step:</Text>
            <Input
              value={stepInput}
              onChange={(e) => handleInputChange(e.target.value, setStepInput)}
              onBlur={(e) => handleStepInputBlur(e.target.value)}
              textAlign="center"
              borderColor="gray.300"
              _hover={{ borderColor: 'gray.400' }}
              _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3182ce' }}
              fontSize="xs"
              size="sm"
              placeholder="0.10"
              w="3.4rem"  // Short fixed width to keep compact
              flexShrink={0}
              sx={{ height: '1.3rem' }}
            />
          </HStack>
        </HStack>
        
        {/* Row 2: Inputs and Refresh Button (labels now inline to the left) */}
        <HStack spacing={3} align="stretch">
          <HStack spacing={2} minW="6rem" flex="1" align="center">
            <Text fontSize="xs" fontWeight="medium" color="gray.500" minW="1rem" textAlign="center">X</Text>
            <Input
              value={xInput}
              onChange={(e) => handleInputChange(e.target.value, setXInput)}
              onBlur={(e) => handleInputBlur(e.target.value, setXInput, 'IMU_OFFSET_SET_X')}
              textAlign="center"
              borderColor="gray.300"
              _hover={{ borderColor: 'gray.400' }}
              _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3182ce' }}
              fontSize="xs"
              size="sm"
              placeholder="0.00"
              flex="1"
            />
          </HStack>
          <HStack spacing={2} minW="6rem" flex="1" align="center">
            <Text fontSize="xs" fontWeight="medium" color="gray.500" minW="1rem" textAlign="center">Y</Text>
            <Input
              value={yInput}
              onChange={(e) => handleInputChange(e.target.value, setYInput)}
              onBlur={(e) => handleInputBlur(e.target.value, setYInput, 'IMU_OFFSET_SET_Y')}
              textAlign="center"
              borderColor="gray.300"
              _hover={{ borderColor: 'gray.400' }}
              _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3182ce' }}
              fontSize="xs"
              size="sm"
              placeholder="0.00"
              flex="1"
            />
          </HStack>
          <HStack spacing={2} minW="6rem" flex="1" align="center">
            <Text fontSize="xs" fontWeight="medium" color="gray.500" minW="1rem" textAlign="center">Z</Text>
            <Input
              value={zInput}
              onChange={(e) => handleInputChange(e.target.value, setZInput)}
              onBlur={(e) => handleInputBlur(e.target.value, setZInput, 'IMU_OFFSET_SET_Z')}
              textAlign="center"
              borderColor="gray.300"
              _hover={{ borderColor: 'gray.400' }}
              _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3182ce' }}
              fontSize="xs"
              size="sm"
              placeholder="0.00"
              flex="1"
            />
          </HStack>
          <VStack spacing={1} minW="6rem" flex="1" align="stretch" justify="end">
            <IconButton
              aria-label="Refresh IMU Offsets"
              onClick={handleGet}
              size="sm"
              variant="outline"
              minW="auto"
              px={2}
              w="32px"  // Added to make the button square (matches size="sm" height)
              borderColor="gray.300"
              icon={<Icon as={FiRefreshCw} boxSize={3} />}
              isDisabled={!state.serial.isConnected}
              ml={'-0.2rem'}
            />
          </VStack>
        </HStack>

        {/* Row 3: +/- Buttons (labels now inline to the left) */}
        <HStack spacing={3} align="stretch">
          <HStack spacing={2} minW="6rem" flex="1" align="center">
            <Text fontSize="xs" fontWeight="medium" color="gray.500" minW="1rem" textAlign="center"> </Text> {/* Empty spacer for label alignment */}
            <HStack spacing={1} justify="center" flex="1">
              <IconButton
                aria-label="Decrease X"
                onClick={() => handleStepChange('x', 'minus')}
                size="sm"  // Increased from "xs" to match input height (32px)
                variant="outline"
                icon={<Icon as={FiMinus} boxSize={2} />}
                isDisabled={!state.serial.isConnected}
                borderColor="gray.300"
                minW="auto"
                flex="1"  // Added to make buttons stretch and match input width
                sx={{ height: '24px' }}  // Added to reduce height only
              />
              <IconButton
                aria-label="Increase X"
                onClick={() => handleStepChange('x', 'plus')}
                size="sm"  // Increased from "xs" to match input height (32px)
                variant="outline"
                icon={<Icon as={FiPlus} boxSize={2} />}
                isDisabled={!state.serial.isConnected}
                borderColor="gray.300"
                minW="auto"
                flex="1"  // Added to make buttons stretch and match input width
                sx={{ height: '24px' }}  // Added to reduce height only
              />
            </HStack>
          </HStack>
          <HStack spacing={2} minW="6rem" flex="1" align="center">
            <Text fontSize="xs" fontWeight="medium" color="gray.500" minW="1rem" textAlign="center"> </Text> {/* Empty spacer for label alignment */}
            <HStack spacing={1} justify="center" flex="1">
              <IconButton
                aria-label="Decrease Y"
                onClick={() => handleStepChange('y', 'minus')}
                size="sm"  // Increased from "xs" to match input height (32px)
                variant="outline"
                icon={<Icon as={FiMinus} boxSize={2} />}
                isDisabled={!state.serial.isConnected}
                borderColor="gray.300"
                minW="auto"
                flex="1"  // Added to make buttons stretch and match input width
                sx={{ height: '24px' }}  // Added to reduce height only
              />
              <IconButton
                aria-label="Increase Y"
                onClick={() => handleStepChange('y', 'plus')}
                size="sm"  // Increased from "xs" to match input height (32px)
                variant="outline"
                icon={<Icon as={FiPlus} boxSize={2} />}
                isDisabled={!state.serial.isConnected}
                borderColor="gray.300"
                minW="auto"
                flex="1"  // Added to make buttons stretch and match input width
                sx={{ height: '24px' }}  // Added to reduce height only
              />
            </HStack>
          </HStack>
          <HStack spacing={2} minW="6rem" flex="1" align="center">
            <Text fontSize="xs" fontWeight="medium" color="gray.500" minW="1rem" textAlign="center"> </Text> {/* Empty spacer for label alignment */}
            <HStack spacing={1} justify="center" flex="1">
              <IconButton
                aria-label="Decrease Z"
                onClick={() => handleStepChange('z', 'minus')}
                size="sm"  // Increased from "xs" to match input height (32px)
                variant="outline"
                icon={<Icon as={FiMinus} boxSize={2} />}
                isDisabled={!state.serial.isConnected}
                borderColor="gray.300"
                minW="auto"
                flex="1"  // Added to make buttons stretch and match input width
                sx={{ height: '24px' }}  // Added to reduce height only
              />
              <IconButton
                aria-label="Increase Z"
                onClick={() => handleStepChange('z', 'plus')}
                size="sm"  // Increased from "xs" to match input height (32px)
                variant="outline"
                icon={<Icon as={FiPlus} boxSize={2} />}
                isDisabled={!state.serial.isConnected}
                borderColor="gray.300"
                minW="auto"
                flex="1"  // Added to make buttons stretch and match input width
                sx={{ height: '24px' }}  // Added to reduce height only
              />
            </HStack>
          </HStack>
          <Box minW="6rem" flex="1" /> {/* Spacer for refresh button position */}
        </HStack>
      </VStack>
    </Box>
  )
}