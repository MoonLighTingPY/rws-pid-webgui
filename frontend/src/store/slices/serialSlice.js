export const initialSerialState = {
  isConnected: false,
  isStreaming: false,
  selectedPort: '',
  availablePorts: [],
  consoleMessages: [],
}

export function serialReducer(state, action) {
  switch (action.type) {
    case 'SERIAL_SET_PORTS':
      return { ...state, availablePorts: action.payload }
    case 'SERIAL_SET_SELECTED_PORT':
      return { ...state, selectedPort: action.payload }
    case 'SERIAL_SET_CONNECTED':
      return { ...state, isConnected: action.payload }
    case 'SERIAL_SET_STREAMING':
      return { ...state, isStreaming: action.payload }
    case 'SERIAL_ADD_CONSOLE_MESSAGE':
      return {
        ...state,
        consoleMessages: [...state.consoleMessages, action.payload].slice(-100) // Keep last 100 messages
      }
    case 'SERIAL_CLEAR_CONSOLE':
      return { ...state, consoleMessages: [] }
    default:
      return state
  }
}