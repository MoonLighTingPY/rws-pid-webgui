import { useState, useRef, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  useToast
} from '@chakra-ui/react'
import { useStore } from '../store'
import { apiService } from '../services/apiService.js'

export default function CommandConsole() {
  const { state, dispatch } = useStore()
  const [command, setCommand] = useState('')
  const messagesEndRef = useRef(null)
  const toast = useToast()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.serial.consoleMessages])

  // Parse PID response and update state
  useEffect(() => {
    const lastMessage = state.serial.consoleMessages[state.serial.consoleMessages.length - 1]
    if (lastMessage && lastMessage.type === 'received') {
      const pidMatch = lastMessage.text.match(/P:\s*([\d.]+),\s*I:\s*([\d.]+),\s*D:\s*([\d.]+)/)
      if (pidMatch) {
        dispatch({
          type: 'PID_SET_VALUES',
          payload: {
            p: parseFloat(pidMatch[1]),
            i: parseFloat(pidMatch[2]),
            d: parseFloat(pidMatch[3])
          }
        })
      }
    }
  }, [state.serial.consoleMessages, dispatch])

  const handleSendCommand = async () => {
    if (!command.trim()) return

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
      await apiService.sendCommand(command)
      
      dispatch({
        type: 'SERIAL_ADD_CONSOLE_MESSAGE',
        payload: {
          timestamp: Date.now(),
          text: command,
          type: 'sent'
        }
      })
      
      setCommand('')
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to send command',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendCommand()
    }
  }

  const handleClearConsole = () => {
    dispatch({ type: 'SERIAL_CLEAR_CONSOLE' })
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <Box p={4} border="1px" borderColor="gray.200" borderRadius="md">
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <Text fontWeight="semibold">Command Console</Text>
          <Button size="sm" onClick={handleClearConsole}>
            Clear
          </Button>
        </HStack>
        
        {/* Console Messages */}
        <Box
          height="200px"
          overflowY="auto"
          border="1px"
          borderColor="gray.100"
          borderRadius="md"
          p={3}
          bg="gray.50"
          fontFamily="mono"
          fontSize="sm"
        >
          {state.serial.consoleMessages.map((message, index) => (
            <Box key={index} mb={1}>
              <Text
                color={message.type === 'sent' ? 'blue.600' : 'green.600'}
                display="inline"
              >
                [{formatTimestamp(message.timestamp)}] {message.type === 'sent' ? '>' : '<'} 
              </Text>
              <Text display="inline" ml={2}>
                {message.text}
              </Text>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>

        {/* Command Input */}
        <HStack>
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type command here..."
            disabled={!state.serial.isConnected}
          />
          <Button
            colorScheme="blue"
            onClick={handleSendCommand}
            disabled={!state.serial.isConnected || !command.trim()}
          >
            Send
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}