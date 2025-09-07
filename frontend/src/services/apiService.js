const API_BASE = 'http://127.0.0.1:5000'

export const apiService = {
  async getPorts() {
    const response = await fetch(`${API_BASE}/api/ports`)
    if (!response.ok) throw new Error('Failed to fetch ports')
    return response.json()
  },

  async connect(port, baud = 115200) {
    const response = await fetch(`${API_BASE}/api/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port, baud })
    })
    if (!response.ok) throw new Error('Failed to connect')
    return response.json()
  },

  async disconnect() {
    const response = await fetch(`${API_BASE}/api/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) throw new Error('Failed to disconnect')
    return response.json()
  },

  async sendCommand(cmd) {
    const response = await fetch(`${API_BASE}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd })
    })
    if (!response.ok) throw new Error('Failed to send command')
    return response.json()
  },

  createEventSource() {
    return new EventSource(`${API_BASE}/stream`)
  },

  createWebSocket() {
    return new WebSocket(`ws://127.0.0.1:5000/ws`)
  }
}