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
      return { ...state, timeWindow: action.payload };
    }
    case 'CHART_CLEAR_DATA':
      return { ...state, data: [] }
    default:
      return state
  }
}