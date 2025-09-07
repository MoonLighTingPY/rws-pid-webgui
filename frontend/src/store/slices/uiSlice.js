export const initialUiState = {
  isCanvasMode: false,
}

export function uiReducer(state = initialUiState, action) {
  switch (action.type) {
    case 'UI_TOGGLE_CANVAS':
      return { ...state, isCanvasMode: !state.isCanvasMode }
    default:
      return state
  }
}