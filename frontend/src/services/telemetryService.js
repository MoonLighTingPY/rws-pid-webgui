// Handles WebSocket telemetry stream and dispatches store actions.

import { useEffect } from 'react'
import { apiService } from './apiService.js'

class TelemetryClient {
  constructor() {
    this.ws = null
    this.dispatch = null
    this.isStreaming = false
    this.connected = false
    this.reconnectTimer = null
  }

  start(dispatch) {
    // Always update dispatch reference so actions use the latest dispatch
    this.dispatch = dispatch
    if (this.ws || this.connected) return
    this._open()
  }

  _open() {
    try {
      this.ws = apiService.createWebSocket()
    } catch {
      this._scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.connected = true
    }

    this.ws.onmessage = (evt) => {
      let data
      try {
        data = JSON.parse(evt.data)
      } catch {
        return
      }
      if (!data?.type) return
      switch (data.type) {
      case 'pid':
        if (this.isStreaming) {
          this.dispatch({
            type: 'CHART_ADD_PID_DATA',
            payload: {
              timestamp: data.timestamp,
              setpoint: data.setpoint,
              pitch: data.pitch,
              error: data.error,
            },
          })
        }
        break
      case 'angle':
        if (this.isStreaming) {
          this.dispatch({
            type: 'CHART_ADD_ANGLE_DATA',
            payload: {
              timestamp: data.timestamp,
              pitch_angle: data.pitch_angle,
              roll_angle: data.roll_angle,
            },
          })
        }
        break
      case 'freq':
        this.dispatch({ type: 'CHART_SET_FREQUENCY', payload: data.value })
        break
      case 'console':
        this.dispatch({
          type: 'SERIAL_ADD_CONSOLE_MESSAGE',
          payload: {
            timestamp: Date.now(),
            text: data.text,
            type: 'received'
          }
        })
        break
      default:
        break
      }
    }

    this.ws.onclose = () => {
      this.connected = false
      this.ws = null
      if (this.dispatch) {
        // Only try to reconnect if still logically connected at app level
        this._scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      try { this.ws?.close() } catch { /* empty */ }
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.dispatch) this._open()
    }, 800)
  }

  setStreaming(flag) {
    this.isStreaming = !!flag
    if (!flag) {
      // When stopping streaming, zero frequency immediately (matches prior behavior)
      this.dispatch?.({ type: 'CHART_SET_FREQUENCY', payload: 0 })
    }
  }

  stop() {
    this.dispatch = null
    this.isStreaming = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      try { this.ws.close() } catch { /* empty */ }
    }
    this.ws = null
    this.connected = false
  }
}

export const telemetryClient = new TelemetryClient()

// Hook to bind telemetry lifecycle to connection + streaming state
export function useTelemetry(isConnected, isStreaming, dispatch) {
  // Start/stop connection
  useEffect(() => {
    if (isConnected) {
      telemetryClient.start(dispatch)
    } else {
      telemetryClient.stop()
    }
    // ensure telemetry is stopped on unmount
    return () => {
      telemetryClient.stop()
    }
  }, [isConnected, dispatch])

  // Update streaming flag
  useEffect(() => {
    telemetryClient.setStreaming(isStreaming)
  }, [isStreaming])
}