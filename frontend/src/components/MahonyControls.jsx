import {
  Box,
  HStack,
  VStack,
  Button,
  Text,
  Input,
  useToast,
  Icon,
  IconButton
} from '@chakra-ui/react'
import { FiRefreshCw, FiCheck } from 'react-icons/fi'
import { useStore } from '../store'
import { apiService } from '../services/apiService.js'
import { useState, useEffect } from 'react'

export default function MahonyControls() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const [pInput, setPInput] = useState(state.mahony?.p?.toString() ?? '0.00')
  const [iInput, setIInput] = useState(state.mahony?.i?.toString() ?? '0.00')

  // Sync from store if you later add a mahony slice
  useEffect(() => {
    setPInput((state.mahony?.p ?? 0).toString())
    setIInput((state.mahony?.i ?? 0).toString())
  }, [state.mahony?.p, state.mahony?.i])

  const validateInput = (val) => {
    if (val === "" || val === "." || val === "-.") return false
    const parsed = parseFloat(val)
    if (isNaN(parsed)) return false
    return true
  }

  const handleInputChange = (value, setter) => {
    if (value === "" || value === "-" || value === "." || value === "-." || /^-?\d*\.?\d*$/.test(value)) {
      setter(value)
    }
  }

  const handleInputBlur = (value, setter, actionType) => {
    const val = parseFloat(value)
    if (validateInput(value) && isFinite(val)) {
      dispatch({ type: actionType, payload: val })
      setter(val.toString())
    } else {
      // reset from store
      const storeValue = actionType === 'MAHONY_SET_P' ? state.mahony?.p ?? 0 : state.mahony?.i ?? 0
      setter(storeValue.toString())
    }
  }
  
  const handleSet = async () => {
    if (!state.serial.isConnected) {
      toast({ title: 'Error', description: 'Not connected to any port', status: 'error', duration: 3000, isClosable: true })
      return
    }
    try {
      const pVal = parseFloat(pInput)
      const iVal = parseFloat(iInput)
       // send commands individually like PIDControls
       await apiService.sendCommand(`imu mahony p ${pVal}`)
       await apiService.sendCommand(`imu mahony i ${iVal}`)

      const commands = [
        `imu mahony p ${pVal}`,
        `imu mahony i ${iVal}`
      ]
      commands.forEach(cmd => {
        dispatch({
          type: 'SERIAL_ADD_CONSOLE_MESSAGE',
          payload: { timestamp: Date.now(), text: cmd, type: 'sent' }
        })
      })

      // update store immediately
      dispatch({ type: 'MAHONY_SET_VALUES', payload: { p: pVal, i: iVal } })

      toast({ title: 'Mahony Values Set', status: 'success', duration: 2000, isClosable: true })
    } catch {
      toast({ title: 'Error', description: 'Failed to set Mahony values', status: 'error', duration: 3000, isClosable: true })
    }
  }

  const handleGet = async () => {
    if (!state.serial.isConnected) {
      toast({ title: 'Error', description: 'Not connected to any port', status: 'error', duration: 3000, isClosable: true })
      return
    }
    try {
      await apiService.sendCommand('imu mahony show')
      dispatch({
        type: 'SERIAL_ADD_CONSOLE_MESSAGE',
        payload: { timestamp: Date.now(), text: 'imu mahony show', type: 'sent' }
      })
      toast({ title: 'Mahony Values Requested', description: 'Check console for response', status: 'info', duration: 2000, isClosable: true })
    } catch {
      toast({ title: 'Error', description: 'Failed to request Mahony values', status: 'error', duration: 3000, isClosable: true })
    }
  }

  const pValid = validateInput(pInput)
  const iValid = validateInput(iInput)
   const allValid = pValid && iValid

  return (
    <Box
      className="pid-controls" /* reuse PIDControls.css for spacing */
      p={3}
      bg="gray.50"
      borderRadius="lg"
      border="1px"
      borderColor="gray.200"
      flexShrink={0}
      minW="0"
    >
      <VStack spacing={3} align="stretch" h="100%">
        <HStack spacing={2} align="end">
          <Box flex="1">
            <HStack spacing={2} align="center">
              <Text fontSize="xs" fontWeight="medium" color="gray.500" minW="1rem" textAlign="center">P</Text>
              <Input
                value={pInput}
                onChange={(e) => handleInputChange(e.target.value, setPInput)}
                onBlur={(e) => handleInputBlur(e.target.value, setPInput, 'MAHONY_SET_P')}
                textAlign="center"
                borderColor="gray.300"
                _hover={{ borderColor: "gray.400" }}
                _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                fontSize="sm"
                size="sm"
                placeholder="0.00"
                flex="1"
              />
            </HStack>
          </Box>

          <Box flex="1">
            <HStack spacing={2} align="center">
              <Text fontSize="xs" fontWeight="medium" color="gray.500" minW="1rem" textAlign="center">I</Text>
              <Input
                value={iInput}
                onChange={(e) => handleInputChange(e.target.value, setIInput)}
                onBlur={(e) => handleInputBlur(e.target.value, setIInput, 'MAHONY_SET_I')}
                textAlign="center"
                borderColor="gray.300"
                _hover={{ borderColor: "gray.400" }}
                _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
                fontSize="sm"
                size="sm"
                placeholder="0.00"
                flex="1"
              />
            </HStack>
          </Box>

          <HStack spacing={2} flexShrink={0} align="end">
            <IconButton
              aria-label="Refresh Mahony"
              onClick={handleGet}
              size="sm"
              variant="outline"
              minW="auto"
              px={2}
              borderColor="gray.300"
              icon={<Icon as={FiRefreshCw} boxSize={3} />}
              isDisabled={!state.serial.isConnected}
            />
            <IconButton
              aria-label="Set Mahony"
              onClick={handleSet}
              size="sm"
              colorScheme="blue"
              icon={<Icon as={FiCheck} boxSize={3} />}
              isDisabled={!state.serial.isConnected || !allValid}
              _hover={{
                transform: state.serial.isConnected && allValid ? "translateY(-1px)" : "none",
                boxShadow: state.serial.isConnected && allValid ? "lg" : "none"
              }}
              transition="all 0.2s"
            />
          </HStack>
        </HStack>
      </VStack>
    </Box>
  )
}