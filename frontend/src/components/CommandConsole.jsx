import { useState, useRef, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  useToast,
  Icon,
  Divider
} from '@chakra-ui/react'
import { FiTerminal, FiSend, FiTrash2 } from 'react-icons/fi'
import { useStore } from '../store'
import { apiService } from '../services/apiService.js'
import '../styles/CommandConsole.css'

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
    <Box className="command-console" p={5} bg="white" borderRadius="xl" shadow="lg" border="1px" borderColor="gray.100">
      <VStack align="stretch" spacing={4}>
        <HStack justify="space-between" align="center">
          <HStack>
            <Icon as={FiTerminal} color="gray.600" boxSize={5} />
            <Text fontWeight="600" fontSize="lg" color="gray.700">Command Console</Text>
          </HStack>
          <Button 
            size="sm" 
            onClick={handleClearConsole} 
            variant="outline"
            leftIcon={<Icon as={FiTrash2} />}
            borderColor="gray.300"
            _hover={{ 
              borderColor: "red.300", 
              color: "red.500",
              transform: "translateY(-1px)"
            }}
            transition="all 0.2s"
          >
            Clear
          </Button>
        </HStack>

        <Divider />
        
        {/* Console Messages */}
        <Box
          className="console-messages"
          height="180px"
          overflowY="auto"
          border="1px"
          borderColor="gray.200"
          borderRadius="lg"
          p={4}
          bg="gray.900"
          fontSize="sm"
          color="gray.100"
        >
          {state.serial.consoleMessages.length === 0 ? (
            <Text color="gray.500" fontStyle="italic" textAlign="center" mt={8}>
              No messages yet. Start by connecting to a COM port.
            </Text>
          ) : (
            state.serial.consoleMessages.map((message, index) => (
              <Box key={index} mb={2} className="console-message">
                <Text
                  color={message.type === 'sent' ? 'blue.300' : 'green.300'}
                  display="inline"
                  fontWeight="medium"
                  fontSize="xs"
                >
                  [{formatTimestamp(message.timestamp)}] {message.type === 'sent' ? '>' : '<'} 
                </Text>
                <Text display="inline" ml={2} fontFamily="mono">
                  {message.text}
                </Text>
              </Box>
            ))
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Command Input */}
        <HStack spacing={3}>
          <Input
            className="console-input"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type command here..."
            disabled={!state.serial.isConnected}
            bg="white"
            borderColor="gray.300"
            _hover={{ borderColor: "gray.400" }}
            _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px #3182ce" }}
            fontFamily="mono"
            fontSize="sm"
          />
          <Button
            colorScheme="blue"
            onClick={handleSendCommand}
            disabled={!state.serial.isConnected || !command.trim()}
            leftIcon={<Icon as={FiSend} />}
            _hover={{
              transform: (state.serial.isConnected && command.trim()) ? "translateY(-1px)" : "none",
              boxShadow: (state.serial.isConnected && command.trim()) ? "lg" : "none"
            }}
            transition="all 0.2s"
            minW="auto"
            px={6}
          >
            Send
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}