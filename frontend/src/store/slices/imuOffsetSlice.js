export const initialImuOffsetState = {
  x: 0,
  y: 0,
  z: 0,
  step: 0.10, // default step value
}

export function imuOffsetReducer(state = initialImuOffsetState, action) {
  switch (action.type) {
  case 'IMU_OFFSET_SET_VALUES':
    return { ...state, ...action.payload }
  case 'IMU_OFFSET_SET_X':
    return { ...state, x: action.payload }
  case 'IMU_OFFSET_SET_Y':
    return { ...state, y: action.payload }
  case 'IMU_OFFSET_SET_Z':
    return { ...state, z: action.payload }
  case 'IMU_OFFSET_SET_STEP':
    return { ...state, step: action.payload }
  default:
    return state
  }
}