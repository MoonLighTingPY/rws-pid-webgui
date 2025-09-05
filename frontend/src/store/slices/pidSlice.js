export const initialPidState = {
  p: 0,
  i: 0,
  d: 0,
}

export function pidReducer(state, action) {
  switch (action.type) {
    case 'PID_SET_VALUES':
      return { ...state, ...action.payload }
    case 'PID_SET_P':
      return { ...state, p: action.payload }
    case 'PID_SET_I':
      return { ...state, i: action.payload }
    case 'PID_SET_D':
      return { ...state, d: action.payload }
    default:
      return state
  }
}