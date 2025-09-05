export const initialChartState = {
  data: [],
  timeWindow: 30, // seconds
}

export function chartReducer(state, action) {
  switch (action.type) {
    case 'CHART_ADD_DATA': {
      const newData = [...state.data, action.payload]
      const cutoffTime = action.payload.timestamp - (state.timeWindow * 1000)
      const filteredData = newData.filter(point => point.timestamp >= cutoffTime)
      return { ...state, data: filteredData }
    }
    case 'CHART_SET_TIME_WINDOW': {
      const newTimeWindow = action.payload
      const newCutoffTime = Date.now() - (newTimeWindow * 1000)
      const filteredForNewWindow = state.data.filter(point => point.timestamp >= newCutoffTime)
      return { ...state, timeWindow: newTimeWindow, data: filteredForNewWindow }
    }
    case 'CHART_CLEAR_DATA':
      return { ...state, data: [] }
    default:
      return state
  }
}