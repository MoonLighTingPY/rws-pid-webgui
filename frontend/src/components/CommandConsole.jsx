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

// Utility to parse ANSI color codes and return React elements
function parseAnsiToReact(text) {
  // Basic VT100 color mapping
  const ansiColors = {
    '30': '#222', // black
    '31': '#e53e3e', // red
    '32': '#38a169', // green
    '33': '#d69e2e', // yellow
    '34': '#3182ce', // blue
    '35': '#d53f8c', // magenta
    '36': '#00b5d8', // cyan
    '37': '#e2e8f0', // white
    '90': '#718096', // bright black
    '91': '#f56565', // bright red
    '92': '#68d391', // bright green
    '93': '#faf089', // bright yellow
    '94': '#63b3ed', // bright blue
    '95': '#f687b3', // bright magenta
    '96': '#81e6d9', // bright cyan
    '97': '#f7fafc', // bright white
  };

  // Split text into segments by ANSI codes
  // eslint-disable-next-line no-control-regex
  const regex = /\x1b\[(\d+)m/g;
  let result = [];
  let lastIndex = 0;
  let color = null;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      // Add previous plain text
      result.push(
        <span key={key++} style={color ? { color } : {}}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }
    // Update color
    const code = match[1];
    if (code === '0') {
      color = null; // reset
    } else if (ansiColors[code]) {
      color = ansiColors[code];
    }
    lastIndex = regex.lastIndex;
  }
  // Add remaining text
  if (lastIndex < text.length) {
    result.push(
      <span key={key++} style={color ? { color } : {}}>
        {text.slice(lastIndex)}
      </span>
    );
  }
  return result;
}

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
      const pidMatch = lastMessage.text.match(/P:\s*([\d.]+),\s*I:\s*([\d.]+),\s*D:\s*([\d.]+)/i)
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
                <Text display="inline" fontFamily="mono" fontSize="xs">
                  {parseAnsiToReact(message.text)}
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