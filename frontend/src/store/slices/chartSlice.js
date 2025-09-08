export const initialChartState = {
  pidData: [],
  angleData: [],
  timeWindow: 30, // seconds
  packetFrequency: 0, // Hz
}

function prune(dataArray, latestTimestamp, windowSec) {
  const cutoffTime = latestTimestamp - (windowSec * 1000)
  return dataArray.filter(p => p.timestamp >= cutoffTime)
}

export function chartReducer(state, action) {
  switch (action.type) {
  case 'CHART_ADD_PID_DATA': {
    const latest = action.payload
    const newPid = [...state.pidData, latest]
    return { ...state, pidData: prune(newPid, latest.timestamp, state.timeWindow) }
  }
  // new: accept batches
  case 'CHART_ADD_PID_BATCH': {
    const batch = action.payload || []
    if (!batch.length) return state
    const latest = batch[batch.length - 1]
    const newPid = [...state.pidData, ...batch]
    return { ...state, pidData: prune(newPid, latest.timestamp, state.timeWindow) }
  }
  case 'CHART_ADD_ANGLE_DATA': {
    const latest = action.payload
    const newAngle = [...state.angleData, latest]
    return { ...state, angleData: prune(newAngle, latest.timestamp, state.timeWindow) }
  }
  // new: accept angle batches
  case 'CHART_ADD_ANGLE_BATCH': {
    const batch = action.payload || []
    if (!batch.length) return state
    const latest = batch[batch.length - 1]
    const newAngle = [...state.angleData, ...batch]
    return { ...state, angleData: prune(newAngle, latest.timestamp, state.timeWindow) }
  }
  case 'CHART_CLEAR_PID_DATA':
    return { ...state, pidData: [] }
  case 'CHART_CLEAR_ANGLE_DATA':
    return { ...state, angleData: [] }
  case 'CHART_SET_TIME_WINDOW':
    return { ...state, timeWindow: action.payload }
  case 'CHART_SET_FREQUENCY':
    return { ...state, packetFrequency: action.payload }
  default:
    return state
  }
}