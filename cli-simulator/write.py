import struct
import time
import random
import serial
import threading
import math

# === Settings ===
PORT = "COM7"
BAUD = 2000000
DT = 0.001

# === State ===
streaming = False
timestamp = 0

# PID coefficients
pid = {"p": 1.0, "i": 0.5, "d": 0.1}

# Mahony filter coefficients
mahony = {"p": 2.0, "i": 0.1}

# System state
setpoint = 0.0
pitch = 0.0
pitch_rate = 0.0
integral = 0.0
last_error = 0.0

# IMU angles state
pitch_angle = 0.0
roll_angle = 0.0
angle_velocity_pitch = 0.0
angle_velocity_roll = 0.0

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


def update_imu_angles():
    """Simulate realistic IMU angle changes"""
    global pitch_angle, roll_angle, angle_velocity_pitch, angle_velocity_roll
    
    t = timestamp / 1000.0
    
    # Increased base movement amplitudes for larger overall motion
    base_pitch = 25.0 * math.sin(0.2 * t)  # larger slow oscillation
    base_roll = 20.0 * math.cos(0.17 * t)  # larger slow oscillation
    
    # Stronger turbulence to create more visible variation
    turbulence_pitch = 5.0 * math.sin(2.0 * t) + 2.5 * math.sin(5.0 * t)
    turbulence_roll = 4.0 * math.cos(2.2 * t) + 1.8 * math.sin(4.8 * t)
    
    # More frequent and stronger maneuvers
    maneuver_time = int(t / 12) * 12  # every 12 seconds
    maneuver_progress = (t - maneuver_time) / 2.0  # 2 second maneuver window
    
    if maneuver_progress < 1.0:
        # Sigmoid for smooth onset/offset, larger peak amplitudes
        maneuver_factor = 1.0 / (1.0 + math.exp(-10 * (maneuver_progress - 0.5)))
        maneuver_pitch = 45.0 * maneuver_factor * math.sin(math.pi * maneuver_progress)
        maneuver_roll = 35.0 * maneuver_factor * math.cos(math.pi * maneuver_progress)
    else:
        maneuver_pitch = 0.0
        maneuver_roll = 0.0
    
    # Target angles combine base, turbulence and maneuvers
    target_pitch = base_pitch + turbulence_pitch + maneuver_pitch
    target_roll = base_roll + turbulence_roll + maneuver_roll
    
    # Reduced damping and stronger spring constant -> reach targets faster / larger swings
    damping = 0.92
    spring_constant = 12.0
    
    # Acceleration towards target with damping
    pitch_error = target_pitch - pitch_angle
    roll_error = target_roll - roll_angle
    
    angle_velocity_pitch = angle_velocity_pitch * damping + pitch_error * spring_constant * DT
    angle_velocity_roll = angle_velocity_roll * damping + roll_error * spring_constant * DT
    
    # Update angles
    pitch_angle += angle_velocity_pitch * DT
    roll_angle += angle_velocity_roll * DT
    
    # Slightly increased noise for realism
    pitch_angle += random.gauss(0, 0.4)
    roll_angle += random.gauss(0, 0.4)
    
    # Clamp to realistic range (-180 to 180)
    pitch_angle = max(-180.0, min(180.0, pitch_angle))
    roll_angle = max(-180.0, min(180.0, roll_angle))
    
    return pitch_angle, roll_angle


def send_packet():
    """Send one binary data packet according to new struct format"""
    global timestamp
    
    # Update PID system
    sp, pv, err = update_system()
    
    # Update IMU angles
    pa, ra = update_imu_angles()
    
    # Pack according to new structure:
    # uint32_t timestamp
    # struct pid { float setpoint, pitch, error }
    # struct angle { float pitch_angle, roll_angle }
    # uint8_t end
    packet = struct.pack("<I fff ff B", 
                        timestamp,      # timestamp
                        sp, pv, err,    # pid struct
                        pa, ra,         # angle struct
                        10)             # end ('\n')
    
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
            ser.write(f"{COLORS['INFO']}Set {coef.upper()} = {val}{COLORS['RESET']}\n".encode())
        else:
            ser.write(f"{COLORS['ERROR']}Invalid value{COLORS['RESET']}\n".encode())

    elif cmd == "get" and len(argv) == 2:
        coef = argv[1].lower()
        if coef in pid:
            ser.write(f"{COLORS['INFO']}{coef.upper()} = {pid[coef]:.2f}{COLORS['RESET']}\n".encode())
        else:
            ser.write(f"{COLORS['ERROR']}Unknown coefficient{COLORS['RESET']}\n".encode())

    elif cmd == "show":
        msg = f"{COLORS['INFO']}P: {pid['p']:4.2f}, I: {pid['i']:4.2f}, D: {pid['d']:4.2f}{COLORS['RESET']}\n"
        ser.write(msg.encode())

    elif cmd == "stream" and len(argv) == 2:
        if argv[1].lower() == "on":
            streaming = True
            ser.write(f"{COLORS['INFO']}Streaming ON{COLORS['RESET']}\n".encode())
        elif argv[1].lower() == "off":
            streaming = False
            ser.write(f"{COLORS['WARN']}Streaming OFF{COLORS['RESET']}\n".encode())
        else:
            ser.write(b"Usage: pid stream [on|off]\n")

    else:
        ser.write(f"{COLORS['ERROR']}ERR: unknown pid command{COLORS['RESET']}\n".encode())


def cli_imu(argv):
    """Simulate CLI IMU Mahony commands"""
    global mahony

    if not argv or argv[0].lower() != "mahony":
        ser.write(b"Usage: imu mahony [p|i|show] [value]\n")
        return

    if len(argv) == 1:
        ser.write(b"Usage: imu mahony [p|i|show] [value]\n")
        return

    cmd = argv[1].lower()

    if cmd in ["p", "i"] and len(argv) == 3:
        val = argv[2]
        if _is_float(val):
            mahony[cmd] = float(val)
            ser.write(f"{COLORS['INFO']}Set Mahony {cmd.upper()} = {val}{COLORS['RESET']}\n".encode())
        else:
            ser.write(f"{COLORS['ERROR']}Invalid value{COLORS['RESET']}\n".encode())

    elif cmd == "show":
        msg = f"{COLORS['INFO']}P: {mahony['p']:4.2f}, I: {mahony['i']:4.2f}{COLORS['RESET']}\n"
        ser.write(msg.encode())

    else:
        ser.write(f"{COLORS['ERROR']}ERR: unknown mahony command{COLORS['RESET']}\n".encode())


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
    elif parts[0] == "imu":
        cli_imu(parts[1:])
    elif parts[0] == "status":
        # Additional command for testing
        msg = f"{COLORS['INFO']}System Status:{COLORS['RESET']}\n"
        msg += f"  Pitch Angle: {pitch_angle:6.2f}°\n"
        msg += f"  Roll Angle:  {roll_angle:6.2f}°\n"
        msg += f"  PID Pitch:   {pitch:6.2f}\n"
        msg += f"  Setpoint:    {setpoint:6.2f}\n"
        msg += f"  Streaming:   {'ON' if streaming else 'OFF'}\n"
        ser.write(msg.encode())
    elif parts[0] == "help":
        help_msg = f"{COLORS['INFO']}Available commands:{COLORS['RESET']}\n"
        help_msg += "  pid set <p|i|d> <value>\n"
        help_msg += "  pid get <p|i|d>\n"
        help_msg += "  pid show\n"
        help_msg += "  pid stream <on|off>\n"
        help_msg += "  imu mahony <p|i> <value>\n"
        help_msg += "  imu mahony show\n"
        help_msg += "  status\n"
        help_msg += "  help\n"
        ser.write(help_msg.encode())
    else:
        # Unknown → echo like firmware
        ser.write(f"{COLORS['WARN']}Unknown command: {cmd}{COLORS['RESET']}\n".encode())


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
                    ser.write(f"{COLORS['ERROR']}ERR: {e}{COLORS['RESET']}\n".encode())


def log_thread():
    """Thread for periodic colored logs"""
    messages = [
        ("INFO", "System running smoothly"),
        ("WARN", "Sensor jitter detected"),
        ("ERROR", "IMU read timeout")
    ]
    
    while True:
        time.sleep(random.uniform(3, 8))  # every 3–8 sec
        level, msg = random.choice(messages)

        ser.write(f"{COLORS[level]}[{level}] {msg}{COLORS['RESET']}\n".encode())


# Start threads
threading.Thread(target=reader_thread, daemon=True).start()
threading.Thread(target=log_thread, daemon=True).start()

print(f"Enhanced emulator running on {PORT} @ {BAUD}")
print(f"Packet size: {struct.calcsize('<I fff ff B')} bytes")
print("Commands: pid set/get/show/stream, imu mahony p/i/show, status, help")

# Main loop for streaming packets
while True:
    if streaming:
        send_packet()
        time.sleep(DT)
    else:
        time.sleep(0.05)