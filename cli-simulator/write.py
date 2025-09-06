import struct
import time
import random
import serial
import threading

# === Settings ===
PORT = "COM7"
BAUD = 115200
DT = 0.01  # 100 Hz

# === State ===
streaming = False
timestamp = 0

# PID coefficients
pid = {"p": 1.0, "i": 0.5, "d": 0.1}

# System state
setpoint = 0.0
pitch = 0.0
pitch_rate = 0.0
integral = 0.0
last_error = 0.0

# === Serial setup ===
ser = serial.Serial(PORT, BAUD, timeout=1, write_timeout=1)

# ANSI color codes (VT100)
COLORS = {
    "INFO": "\x1b[96m",    # Cyan
    "WARN": "\x1b[93m",    # Yellow
    "ERROR": "\x1b[91m",   # Red
    "RESET": "\x1b[0m"
}


def update_system():
    """Simulate system with PID control"""
    global setpoint, pitch, pitch_rate, integral, last_error

    # Example setpoint: step every 10 sec
    t = timestamp / 1000.0
    setpoint = 20.0 if int(t / 10) % 2 == 0 else 0.0
    # Or try: setpoint = 15.0 * math.sin(0.2 * t)

    # --- PID control ---
    error = setpoint - pitch
    integral += error * DT
    derivative = (error - last_error) / DT
    last_error = error

    u = pid["p"] * error + pid["i"] * integral + pid["d"] * derivative

    # --- System dynamics ---
    # Let's model a 2nd-order system (mass-spring-damper like)
    #   θ'' + 2ζωn θ' + ωn^2 θ = u
    # Here ωn is natural frequency, ζ is damping ratio
    wn = 2.0    # rad/s natural frequency
    zeta = 0.7  # damping ratio

    # Discretized state update using Euler
    acc = u - (2 * zeta * wn * pitch_rate + wn**2 * pitch)
    pitch_rate += acc * DT
    pitch += pitch_rate * DT

    return setpoint, pitch, error



def send_packet():
    """Send one binary data packet according to struct format"""
    global timestamp
    sp, pv, err = update_system()

    packet = struct.pack("<IfffB", timestamp, sp, pv, err, 10)  # '\n'
    try:
        ser.write(packet)
    except serial.SerialTimeoutException:
        pass  # or log the error
    timestamp += int(DT * 1000)  # ms


def cli_pid(argv):
    """Simulate CLI PID commands"""
    global pid, streaming

    if not argv:
        ser.write(b"Usage: pid [set|get|show|stream]\n")
        return

    cmd = argv[0].lower()

    if cmd == "set" and len(argv) == 3:
        coef, val = argv[1].lower(), argv[2]
        if coef in pid and _is_float(val):
            pid[coef] = float(val)
            ser.write(f"Set {coef.upper()} = {val}\n".encode())
        else:
            ser.write(b"Invalid value\n")

    elif cmd == "get" and len(argv) == 2:
        coef = argv[1].lower()
        if coef in pid:
            ser.write(f"{coef.upper()} = {pid[coef]:.2f}\n".encode())
        else:
            ser.write(b"Unknown coefficient\n")

    elif cmd == "show":
        msg = f"P: {pid['p']:4.2f}, I: {pid['i']:4.2f}, D: {pid['d']:4.2f}\n"
        ser.write(msg.encode())

    elif cmd == "stream" and len(argv) == 2:
        if argv[1].lower() == "on":
            streaming = True
            ser.write(b"Streaming ON\n")
        elif argv[1].lower() == "off":
            streaming = False
            ser.write(b"Streaming OFF\n")
        else:
            ser.write(b"Usage: pid stream [on|off]\n")

    else:
        ser.write(b"ERR: unknown pid command\n")


def _is_float(s: str):
    try:
        float(s)
        return True
    except:
        return False


def handle_command(cmd: str):
    """Parse CLI-like command line"""
    parts = cmd.strip().split()
    if not parts:
        return

    if parts[0] == "pid":
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


def log_thread():
    """Thread for periodic colored logs"""
    while True:
        time.sleep(random.uniform(2, 5))  # every 2–5 sec
        level = random.choice(["INFO", "WARN", "ERROR"])
        msg = {
            "INFO": "System running smoothly",
            "WARN": "Sensor jitter detected",
            "ERROR": "IMU read failure!"
        }[level]
        ser.write(f"{COLORS[level]}[{level}] {msg}{COLORS['RESET']}\n".encode())


# Start threads
threading.Thread(target=reader_thread, daemon=True).start()
threading.Thread(target=log_thread, daemon=True).start()

print(f"Emulator running on {PORT} @ {BAUD}")

# Main loop for streaming packets
while True:
    if streaming:
        send_packet()
        time.sleep(DT)  # 200 Hz
    else:
        time.sleep(0.05)
