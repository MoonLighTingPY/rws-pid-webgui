import {
  Box,
  HStack,
  VStack,
  Text,
  Input,
  IconButton,
  useToast,
} from '@chakra-ui/react'
import { FiRefreshCw, FiPlus, FiMinus } from 'react-icons/fi'
import { useStore } from '../store'
import { apiService } from '../services/apiService.js'
import { useState, useEffect } from 'react'

export default function ImuOffsetControls() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const connected = state.serial.isConnected

  const [x, setX] = useState('0.00')
  const [y, setY] = useState('0.00')
  const [z, setZ] = useState('0.00')
  const [step, setStep] = useState('0.10')

  useEffect(() => {
    // Optionally reset when disconnected
    if (!connected) {
      setX('0.00')
      setY('0.00')
      setZ('0.00')
    }
  }, [connected])

  const sendCmd = async (cmd) => {
    if (!connected) {
      toast({ title: 'Error', description: 'Not connected', status: 'error', duration: 2000, isClosable: true })
      return
    }
    try {
      await apiService.sendCommand(cmd)
      dispatch({
        type: 'SERIAL_ADD_CONSOLE_MESSAGE',
        payload: { timestamp: Date.now(), text: cmd, type: 'sent' }
      })
    } catch {
      toast({ title: 'Error', description: 'Failed to send command', status: 'error', duration: 3000, isClosable: true })
    }
  }

  const onInc = async (axis) => {
    const cur = axis === 'x' ? parseFloat(x) : axis === 'y' ? parseFloat(y) : parseFloat(z)
    const s = parseFloat(step) || 0
    const newVal = (cur || 0) + s
    if (axis === 'x') setX(newVal.toFixed(2))
    if (axis === 'y') setY(newVal.toFixed(2))
    if (axis === 'z') setZ(newVal.toFixed(2))
    await sendCmd(`imu offset set ${axis} ${newVal}`)
  }

  const onDec = async (axis) => {
    const cur = axis === 'x' ? parseFloat(x) : axis === 'y' ? parseFloat(y) : parseFloat(z)
    const s = parseFloat(step) || 0
    const newVal = (cur || 0) - s
    if (axis === 'x') setX(newVal.toFixed(2))
    if (axis === 'y') setY(newVal.toFixed(2))
    if (axis === 'z') setZ(newVal.toFixed(2))
    await sendCmd(`imu offset set ${axis} ${newVal}`)
  }

  const onBlurVal = async (axis, val, setter) => {
    const parsed = parseFloat(val)
    if (Number.isFinite(parsed)) {
      setter(parsed.toFixed(2))
      await sendCmd(`imu offset set ${axis} ${parsed}`)
    } else {
      // restore previous if invalid
      setter('0.00')
    }
  }

  const onRefresh = async () => {
    await sendCmd('imu offset show')
    toast({ title: 'Requested offsets', status: 'info', duration: 1500, isClosable: true })
  }

  return (
    <Box
      className="pid-controls"
      p={3}
      bg="gray.50"
      borderRadius="lg"
      border="1px"
      borderColor="gray.200"
      flexShrink={0}
      minW="0"
    >
      <VStack spacing={3} align="stretch" h="100%">
        <HStack justify="space-between" align="center">
          <Text fontSize="xs" marginTop={-2} marginBottom={-2}>IMU Offsets</Text>
          <HStack spacing={2}>
            <Input
              value={step}
              onChange={(e) => setStep(e.target.value)}
              size="sm"
              width="2.5rem"           // made step input slightly smaller
              textAlign="center"
              placeholder="0.10"
            />
            <IconButton
              aria-label="Refresh Offsets"
              onClick={onRefresh}
              size="sm"
              icon={<FiRefreshCw />}
              isDisabled={!connected}
            />
          </HStack>
        </HStack>

        {/* Each axis: label on left, input in middle, +/- horizontally to the right (under each input) */}
        <HStack spacing={3} align="stretch">
          <VStack spacing={1} align="stretch" flex="1">
            <HStack align="center" spacing={2}>
              <Text fontSize="xs" fontWeight="medium" color="gray.500" minW="1.2rem" textAlign="center">X</Text>
              <VStack spacing={2} align="stretch" flex="1">
                <Input
                  value={x}
                  onChange={(e) => setX(e.target.value)}
                  onBlur={(e) => onBlurVal('x', e.target.value, setX)}
                  textAlign="center"
                  size="sm"
                  bg="white"
                />
                {/* horizontal +/- buttons */}
                <HStack spacing={2} justify="center">
                  <IconButton aria-label="X+" onClick={() => onInc('x')} icon={<FiPlus />} size="sm" isDisabled={!connected} />
                  <IconButton aria-label="X-" onClick={() => onDec('x')} icon={<FiMinus />} size="sm" isDisabled={!connected} />
                </HStack>
              </VStack>
            </HStack>
          </VStack>

          <VStack spacing={1} align="stretch" flex="1">
            <HStack align="center" spacing={2}>
              <Text fontSize="xs" fontWeight="medium" color="gray.500" minW="1.2rem" textAlign="center">Y</Text>
              <VStack spacing={2} align="stretch" flex="1">
                <Input
                  value={y}
                  onChange={(e) => setY(e.target.value)}
                  onBlur={(e) => onBlurVal('y', e.target.value, setY)}
                  textAlign="center"
                  size="sm"
                  bg="white"
                />
                {/* horizontal +/- buttons */}
                <HStack spacing={2} justify="center">
                  <IconButton aria-label="Y+" onClick={() => onInc('y')} icon={<FiPlus />} size="sm" isDisabled={!connected} />
                  <IconButton aria-label="Y-" onClick={() => onDec('y')} icon={<FiMinus />} size="sm" isDisabled={!connected} />
                </HStack>
              </VStack>
            </HStack>
          </VStack>

          <VStack spacing={1} align="stretch" flex="1">
            <HStack align="center" spacing={2}>
              <Text fontSize="xs" fontWeight="medium" color="gray.500" minW="1.2rem" textAlign="center">Z</Text>
              <VStack spacing={2} align="stretch" flex="1">
                <Input
                  value={z}
                  onChange={(e) => setZ(e.target.value)}
                  onBlur={(e) => onBlurVal('z', e.target.value, setZ)}
                  textAlign="center"
                  size="sm"
                  bg="white"
                />
                {/* horizontal +/- buttons */}
                <HStack spacing={2} justify="center">
                  <IconButton aria-label="Z+" onClick={() => onInc('z')} icon={<FiPlus />} size="sm" isDisabled={!connected} />
                  <IconButton aria-label="Z-" onClick={() => onDec('z')} icon={<FiMinus />} size="sm" isDisabled={!connected} />
                </HStack>
              </VStack>
            </HStack>
          </VStack>
        </HStack>
      </VStack>
    </Box>
  )
}