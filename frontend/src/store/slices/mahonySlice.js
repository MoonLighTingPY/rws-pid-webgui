export const initialMahonyState = {
  p: 0,
  i: 0,
}

export function mahonyReducer(state = initialMahonyState, action) {
  switch (action.type) {
    case 'MAHONY_SET_VALUES':
      return { ...state, ...action.payload }
    case 'MAHONY_SET_P':
      return { ...state, p: action.payload }
    case 'MAHONY_SET_I':
      return { ...state, i: action.payload }
    default:
      return state
  }
}
