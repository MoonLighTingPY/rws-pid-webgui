from flask import Flask, request, Response, jsonify, stream_with_context, send_from_directory
try:
    from flask_cors import CORS
except Exception:
    CORS = None
import threading
import queue
import time
import struct
import json
import serial
import serial.tools.list_ports
import os
import sys
from math import isfinite

# Optional websocket support
try:
    from flask_sock import Sock
except Exception:
    Sock = None

app = Flask(__name__)
if CORS:
    CORS(app, resources={r"/stream": {"origins": "*"}, r"/api/*": {"origins": "*"}, r"/ws": {"origins": "*"}})

if Sock:
    sock = Sock(app)
else:
    sock = None

# When packaged by PyInstaller, data files are extracted to sys._MEIPASS.
BASE_DIR = getattr(sys, "_MEIPASS", os.path.dirname(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web")  # populated by build script / included in bundle

# Binary packet layout (little-endian):
# uint32 timestamp, float setpoint, float pitch, float error, float pitch_angle, float roll_angle, uint8 end ('\n')
PACKET_SIZE = 25
PACKET_STRUCT = struct.Struct("<IfffffB")

class SerialService:
    def __init__(self):
        self.ser = None
        self.thread = None
        self.running = False
        self.q = queue.Queue()
        self.packet_counter = 0
        self.last_freq_time = time.time()

    def connect(self, port, baud=2000000):
        if self.ser and self.ser.is_open:
            self.disconnect()
        self.ser = serial.Serial(port, baud, timeout=0.05)

        # Clear any transient data so the first real response is not mixed with noise
        try:
            self.ser.reset_input_buffer()
            self.ser.reset_output_buffer()
        except Exception:
            pass

        self.running = True
        self.thread = threading.Thread(target=self.read_loop, daemon=True)
        self.thread.start()
        return True

    def disconnect(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=0.5)
        if self.ser:
            try:
                self.ser.close()
            except Exception:
                pass
        self.ser = None
        return True

    def send(self, cmd: str):
        if not self.ser or not self.ser.is_open:
            raise RuntimeError("Not connected")
        payload = cmd.strip() + "\n"
        self.ser.write(payload.encode())

    def _emit_frequency_if_needed(self):
        now = time.time()
        elapsed = now - self.last_freq_time
        if elapsed >= 0.3:
            freq = self.packet_counter / elapsed if elapsed > 0 else 0.0
            self.q.put({"type": "freq", "value": freq})
            self.packet_counter = 0
            self.last_freq_time = now

    def read_loop(self):
        buf = bytearray()
        while self.running and self.ser and self.ser.is_open:
            try:
                available = self.ser.in_waiting
            except Exception:
                available = 0
            if available:
                chunk = self.ser.read(available)
                buf.extend(chunk)
                # Parse packets / lines
                while True:
                    # Binary packet
                    if len(buf) >= PACKET_SIZE and buf[PACKET_SIZE - 1] == 0x0A:  # '\n'
                        raw_pkt = bytes(buf[:PACKET_SIZE])
                        del buf[:PACKET_SIZE]
                        try:
                            ts, setpoint, pitch, error, pitch_ang, roll_ang, endb = PACKET_STRUCT.unpack(raw_pkt)
                            # Basic sanity check
                            if not all(isfinite(v) for v in (setpoint, pitch, error, pitch_ang, roll_ang)):
                                raise ValueError("non-finite values")
                            # Enqueue separate logical messages
                            self.q.put({
                                "type": "pid",
                                "timestamp": ts,
                                "setpoint": setpoint,
                                "pitch": pitch,
                                "error": error
                            })
                            self.q.put({
                                "type": "angle",
                                "timestamp": ts,
                                "pitch_angle": pitch_ang,
                                "roll_angle": roll_ang
                            })
                            self.packet_counter += 1
                            self._emit_frequency_if_needed()
                            continue
                        except Exception:
                            # Fall through to attempt text parsing
                            pass
                    # Text line
                    nl_index = buf.find(b"\n")
                    if nl_index != -1:
                        line = bytes(buf[:nl_index])
                        del buf[: nl_index + 1]
                        try:
                            text = line.decode(errors="replace")
                        except Exception:
                            text = "<decode error>"
                        if text:
                            self.q.put({"type": "console", "text": text})
                        continue
                    break
            else:
                time.sleep(0.01)
        # Drain remaining partial text (optional)
        if buf:
            try:
                text = buf.decode(errors="replace")
                if text:
                    self.q.put({"type": "console", "text": text})
            except Exception:
                pass
        self.q.put({"type": "console", "text": "serial: disconnected"})

serial_service = SerialService()

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response

@app.route("/api/ports", methods=["GET"])
def list_ports():
    ports = [p.device for p in serial.tools.list_ports.comports()]
    return jsonify({"ports": ports})

# Serve frontend (fallback to index.html for SPA routes)
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if os.path.isdir(WEB_DIR):
        full_path = os.path.join(WEB_DIR, path)
        if path and os.path.exists(full_path) and os.path.isfile(full_path):
            return send_from_directory(WEB_DIR, path)
        return send_from_directory(WEB_DIR, "index.html")
    return jsonify({"error": "frontend not built"}), 404

@app.route("/api/connect", methods=["POST"])
def api_connect():
    data = request.json or {}
    port = data.get("port")
    baud = int(data.get("baud", 2000000))
    if not port:
        return jsonify({"error": "port required"}), 400
    try:
        serial_service.connect(port, baud)
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e) or type(e).__name__}), 500

@app.route("/api/disconnect", methods=["POST"])
def api_disconnect():
    serial_service.disconnect()
    return jsonify({"ok": True})

@app.route("/api/send", methods=["POST"])
def api_send():
    data = request.json or {}
    cmd = data.get("cmd", "")
    try:
        serial_service.send(cmd)
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e) or type(e).__name__}), 500

# Legacy SSE endpoint (kept for backward compatibility)
@app.route("/stream")
def stream():
    def event_stream():
        while True:
            item = serial_service.q.get()
            yield "data: " + json.dumps(item) + "\n\n"
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET",
    }
    return Response(stream_with_context(event_stream()), mimetype="text/event-stream", headers=headers)

# WebSocket endpoint
if sock:
    @sock.route('/ws')
    def ws(ws):  # type: ignore
        while True:
            item = serial_service.q.get()
            try:
                ws.send(json.dumps(item))
            except Exception:
                break

if __name__ == "__main__":
    if not os.path.isdir(WEB_DIR):
        BASE_DIR = os.path.dirname(__file__)
        WEB_DIR = os.path.join(BASE_DIR, "web")
    print("Starting backend on http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, threaded=True)