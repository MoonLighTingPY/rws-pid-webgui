import struct
import time
import random
import serial
import threading

# === Settings ===
PORT = "COM7"
BAUD = 115200

# === State ===
streaming = False
timestamp = 0

# PID coefficients
pid = {
    "p": 1.0,
    "i": 0.5,
    "d": 0.1
}

# === Serial setup ===
ser = serial.Serial(PORT, BAUD, timeout=0.1)

def send_packet():
    """Send one binary data packet according to struct format"""
    global timestamp
    setpoint = random.uniform(-30, 30)
    pitch    = setpoint + random.uniform(-5, 5)
    error    = setpoint - pitch

    packet = struct.pack(
        "<IfffB",
        timestamp,
        setpoint,
        pitch,
        error,
        10   # '\n'
    )
    ser.write(packet)
    timestamp += 20

def cli_pid(argv):
    """Simulate C function cli_pid(argc, argv)"""
    global pid

    if len(argv) == 1 or not _is_float(argv[0]):  
        # Print PID values
        msg = f"P: {pid['p']:.2f}, I: {pid['i']:.2f}, D: {pid['d']:.2f}\n"
        ser.write(msg.encode())
        return

    arg0 = argv[0]
    if len(argv) < 2 or not _is_float(argv[1]):
        ser.write(b"Invalid value\n")
        return

    value = float(argv[1])
    if arg0 == "p":
        pid["p"] = value
    elif arg0 == "i":
        pid["i"] = value
    elif arg0 == "d":
        pid["d"] = value
    else:
        ser.write(b"ERR: unknown PID arg\n")
        return

    # No explicit log_info in C on success → silent update

def _is_float(s: str):
    try:
        float(s)
        return True
    except:
        return False

def handle_command(cmd: str):
    """Parse CLI-like command line"""
    global streaming

    parts = cmd.strip().split()
    if not parts:
        return

    if parts[0] == "gui":
        if len(parts) > 1 and parts[1] == "start":
            streaming = True
            ser.write(b"OK: start streaming\n")
        elif len(parts) > 1 and parts[1] == "stop":
            streaming = False
            ser.write(b"OK: stop streaming\n")
        else:
            ser.write(b"ERR: unknown gui cmd\n")

    elif parts[0] == "pid":
        cli_pid(parts[1:])

    else:
        # Unknown → echo like firmware
        ser.write(f"Unknown command: {cmd}\n".encode())

def reader_thread():
    """Thread for handling incoming commands from GUI"""
    buf = b""
    while True:
        if ser.in_waiting > 0:
            buf += ser.read(ser.in_waiting)
            while b"\n" in buf:
                line, buf = buf.split(b"\n", 1)
                try:
                    handle_command(line.decode().strip())
                except Exception as e:
                    ser.write(f"ERR: {e}\n".encode())

# Start reader thread
threading.Thread(target=reader_thread, daemon=True).start()

print(f"Emulator running on {PORT} @ {BAUD}")

# Main loop for streaming packets
while True:
    if streaming:
        send_packet()
        time.sleep(0.02)  # 50 Hz
    else:
        time.sleep(0.1)
