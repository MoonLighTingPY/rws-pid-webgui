import React, { createContext, useContext, useReducer } from 'react'
import { serialReducer, initialSerialState } from './slices/serialSlice'
import { chartReducer, initialChartState } from './slices/chartSlice'
import { pidReducer, initialPidState } from './slices/pidSlice'

const StoreContext = createContext()

const initialState = {
  serial: initialSerialState,
  chart: initialChartState,
  pid: initialPidState,
}

function rootReducer(state, action) {
  return {
    serial: serialReducer(state.serial, action),
    chart: chartReducer(state.chart, action),
    pid: pidReducer(state.pid, action),
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(rootReducer, initialState)

  // Use createElement instead of JSX so the file can remain .js (no JSX parsing required)
  return React.createElement(
    StoreContext.Provider,
    { value: { state, dispatch } },
    children
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}