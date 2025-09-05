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
    <Box 
      className="command-console" 
      p={4} 
      bg="white" 
      borderRadius="xl" 
      shadow="lg" 
      border="1px" 
      borderColor="gray.100"
      h="100%"
      display="flex"
      flexDirection="column"
    >
      <VStack align="stretch" spacing={3} h="100%">
        
        {/* Console Messages */}
        <Box
          className="console-messages"
          flex="1"
          overflowY="auto"
          border="1px"
          borderColor="gray.200"
          borderRadius="lg"
          p={3}
          bg="gray.900"
          fontSize="xs"
          color="gray.100"
          minH="0"
        >
          {state.serial.consoleMessages.length === 0 ? (
            <Text color="gray.500" fontStyle="italic" textAlign="center" mt={4}>
              No messages yet. Start by connecting to a COM port.
            </Text>
          ) : (
            state.serial.consoleMessages.map((message, index) => (
              <Box key={index} mb={1} className="console-message">
                <Text
                  color={message.type === 'sent' ? 'blue.300' : 'green.300'}
                  display="inline"
                  fontWeight="medium"
                  fontSize="xs"
                >
                  [{formatTimestamp(message.timestamp)}] {message.type === 'sent' ? '>' : '<'} 
                </Text>
                <Text display="inline" ml={2} fontFamily="mono" fontSize="xs">
                  {message.text}
                </Text>
              </Box>
            ))
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Command Input */}
        <HStack spacing={2} flexShrink={0}>
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
            size="sm"
          />
          <Button 
            size="sm" 
            onClick={handleClearConsole} 
            variant="outline"
            leftIcon={<Icon as={FiTrash2} boxSize={3} />}
            borderColor="gray.300"
            _hover={{ 
              borderColor: "red.300", 
              color: "red.500",
              transform: "translateY(-1px)"
            }}
            transition="all 0.2s"
            px={3}
          >
            Clear
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSendCommand}
            disabled={!state.serial.isConnected || !command.trim()}
            leftIcon={<Icon as={FiSend} boxSize={3} />}
            _hover={{
              transform: (state.serial.isConnected && command.trim()) ? "translateY(-1px)" : "none",
              boxShadow: (state.serial.isConnected && command.trim()) ? "lg" : "none"
            }}
            transition="all 0.2s"
            size="sm"
            px={4}
          >
            Send
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}