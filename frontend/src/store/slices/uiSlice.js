export const initialUiState = {
  isCanvasMode: false,
}

export function uiReducer(state = initialUiState, action) {
  switch (action.type) {
  case 'UI_TOGGLE_CANVAS':
    return { ...state, isCanvasMode: !state.isCanvasMode }
  case 'UI_SET_CANVAS':
    return { ...state, isCanvasMode: !!action.payload }
  default:
    return state
  }
}