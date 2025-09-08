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

    // buffering / batching
    this.pidBuffer = []
    this.angleBuffer = []
    this.flushIntervalMs = 50
    this.flushTimer = null
  }

  start(dispatch) {
    // Always update dispatch reference so actions use the latest dispatch
    this.dispatch = dispatch
    if (this.ws || this.connected) return
    this._open()

    // start periodic flush if not running
    if (!this.flushTimer) {
      this.flushTimer = setInterval(() => this._flushBuffers(), this.flushIntervalMs)
    }
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
        // buffer pid points, don't dispatch immediately
        if (this.isStreaming) {
          this.pidBuffer.push({
            timestamp: data.timestamp,
            setpoint: data.setpoint,
            pitch: data.pitch,
            error: data.error
          })
        }
        break
      case 'angle':
        // buffer angle points
        if (this.isStreaming) {
          this.angleBuffer.push({
            timestamp: data.timestamp,
            pitch_angle: data.pitch_angle,
            roll_angle: data.roll_angle
          })
        }
        break
      case 'freq':
        // frequency can be dispatched immediately (UI badge)
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
        this._scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      try { this.ws?.close() } catch { /* empty */ }
    }
  }

  _flushBuffers() {
    if (!this.dispatch) return

    // Flush pid buffer
    if (this.pidBuffer.length > 0) {
      // send a batch action with array of points
      const batch = this.pidBuffer
      this.pidBuffer = []
      this.dispatch({ type: 'CHART_ADD_PID_BATCH', payload: batch })
    }

    // Flush angle buffer
    if (this.angleBuffer.length > 0) {
      const batch = this.angleBuffer
      this.angleBuffer = []
      this.dispatch({ type: 'CHART_ADD_ANGLE_BATCH', payload: batch })
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
      // clear buffers when stopped
      this.pidBuffer = []
      this.angleBuffer = []
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

    // stop flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    // clear buffers
    this.pidBuffer = []
    this.angleBuffer = []
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