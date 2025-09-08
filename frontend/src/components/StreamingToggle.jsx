import { useToast, HStack } from '@chakra-ui/react'
import { FiPlay, FiPause } from 'react-icons/fi'
import { useStore } from '../store'
import { apiService } from '../services/apiService.js'

export default function StreamingToggle() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const isStreaming = state.serial.isStreaming

  const handleStartStop = async () => {
    if (!state.serial.isConnected) {
      toast({ title: 'Error', description: 'Not connected to any port', status: 'error', duration: 3000, isClosable: true })
      return
    }
    try {
      const command = isStreaming ? 'pid stream off' : 'pid stream on'
      await apiService.sendCommand(command)
      if (!isStreaming) {
        dispatch({ type: 'CHART_CLEAR_PID_DATA' })
        dispatch({ type: 'CHART_CLEAR_ANGLE_DATA' })
      }
      dispatch({ type: 'SERIAL_SET_STREAMING', payload: !isStreaming })
      dispatch({ type: 'SERIAL_ADD_CONSOLE_MESSAGE', payload: { timestamp: Date.now(), text: command, type: 'sent' } })
      // Reset frequency to 0 when stopping streaming
      if (isStreaming) {
        dispatch({ type: 'CHART_SET_FREQUENCY', payload: 0 })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to send command', status: 'error', duration: 3000, isClosable: true })
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      {/* Custom Streaming Toggle Button */}
      <button
        onClick={handleStartStop}
        disabled={!state.serial.isConnected}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '40px',
          padding: '0 12px',
          backgroundColor: isStreaming ? '#f56565' : '#48bb78',
          color: 'white',
          borderTop: `1px solid ${isStreaming ? '#e53e3e' : '#38a169'}`,
          borderBottom: `1px solid ${isStreaming ? '#e53e3e' : '#38a169'}`,
          borderLeft: `1px solid ${isStreaming ? '#e53e3e' : '#38a169'}`,
          borderRight: 'none', // Keep this separate
          borderRadius: '10px 0 0 10px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          cursor: state.serial.isConnected ? 'pointer' : 'not-allowed',
          opacity: state.serial.isConnected ? 1 : 0.6,
          fontSize: '16px',
          fontWeight: '500',
          transition: 'all 0.2s',
          outline: 'none'
        }}
        onMouseEnter={(e) => {
          if (state.serial.isConnected) {
            e.target.style.backgroundColor = isStreaming ? '#e53e3e' : '#38a169'
          }
        }}
        onMouseLeave={(e) => {
          if (state.serial.isConnected) {
            e.target.style.backgroundColor = isStreaming ? '#f56565' : '#48bb78'
          }
        }}
        aria-label={isStreaming ? 'Pause Streaming' : 'Start Streaming'}
      >
        {isStreaming ? <FiPause size={16} /> : <FiPlay size={16} />}
      </button>
      
      {/* Custom Hz Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '40px',
          width: '60px',  // Fixed width to prevent squishing
          padding: '0 8px',
          backgroundColor: '#9270d8ff',
          color: 'white',
          border: '1px solid #7f69b3ff',
          borderRadius: '0 10px 10px 0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          fontSize: '0.7rem',
          fontWeight: '600',
          userSelect: 'none'
        }}
      >
        {state.chart.packetFrequency.toFixed(0)} Hz
      </div>
    </div>
  )
}