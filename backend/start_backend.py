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

app = Flask(__name__)
if CORS:
    # allow cross-origin requests for development (including EventSource)
    CORS(app, resources={r"/stream": {"origins": "*"}, r"/api/*": {"origins": "*"}})

# When packaged by PyInstaller, data files are extracted to sys._MEIPASS.
# Use that location if present so the packaged executable can serve built frontend files.
BASE_DIR = getattr(sys, "_MEIPASS", os.path.dirname(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web")  # populated by build.bat / included in bundle

class SerialService:
    def __init__(self):
        self.ser = None
        self.thread = None
        self.running = False
        self.q = queue.Queue()

    def connect(self, port, baud=115200):
        if self.ser and self.ser.is_open:
            self.disconnect()
        self.ser = serial.Serial(port, baud, timeout=0.1)
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

    def read_loop(self):
        buf = bytearray()
        while self.running and self.ser and self.ser.is_open:
            try:
                n = self.ser.in_waiting
            except Exception:
                n = 0
            if n:
                chunk = self.ser.read(n)
                buf.extend(chunk)

                # parse as many messages as possible
                while True:
                    # Check for binary packet (17 bytes, last byte == 10)
                    if len(buf) >= 17 and buf[16] == 10:
                        pkt = bytes(buf[:17])
                        del buf[:17]
                        try:
                            ts, sp, pitch, err, endb = struct.unpack("<IfffB", pkt)
                            self.q.put({"type": "chart", "timestamp": ts, "setpoint": sp, "pitch": pitch, "error": err})
                            continue
                        except Exception:
                            # fallthrough to text parsing
                            pass

                    # Check for text line
                    if b"\n" in buf:
                        line, rest = buf.split(b"\n", 1)
                        del buf[: len(line) + 1]
                        try:
                            text = line.decode(errors="replace")
                        except Exception:
                            text = "<decode error>"
                        self.q.put({"type": "console", "text": text})
                        continue

                    break
            else:
                time.sleep(0.01)

        # on exit, notify clients
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
    baud = int(data.get("baud", 115200))
    if not port:
        return jsonify({"error": "port required"}), 400
    try:
        serial_service.connect(port, baud)
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
        return jsonify({"error": str(e)}), 500

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

    return Response(
        stream_with_context(event_stream()),
        mimetype="text/event-stream",
        headers=headers
    )

if __name__ == "__main__":
    # Development run (when not packaged). Ensure WEB_DIR points to local web folder.
    if not os.path.isdir(WEB_DIR):
        BASE_DIR = os.path.dirname(__file__)
        WEB_DIR = os.path.join(BASE_DIR, "web")

    # Run Flask dev server on port 5000
    print("Starting backend on http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, threaded=True)