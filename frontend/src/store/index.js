import React, { createContext, useContext, useReducer } from 'react'
import { serialReducer, initialSerialState } from './slices/serialSlice'
import { chartReducer, initialChartState } from './slices/chartSlice'
import { pidReducer, initialPidState } from './slices/pidSlice'
import { uiReducer, initialUiState } from './slices/uiSlice'
import { mahonyReducer, initialMahonyState } from './slices/mahonySlice'
import { imuOffsetReducer, initialImuOffsetState } from './slices/imuOffsetSlice'
 
const StoreContext = createContext()
 
const initialState = {
  serial: initialSerialState,
  chart: initialChartState,
  pid: initialPidState,
  mahony: initialMahonyState,
  imuOffset: initialImuOffsetState,
  ui: initialUiState,
}
 
function rootReducer(state, action) {
  return {
    serial: serialReducer(state.serial, action),
    chart: chartReducer(state.chart, action),
    pid: pidReducer(state.pid, action),
    mahony: mahonyReducer(state.mahony, action),
    imuOffset: imuOffsetReducer(state.imuOffset, action),
    ui: uiReducer(state.ui, action),
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