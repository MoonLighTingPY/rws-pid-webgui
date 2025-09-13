import struct
import time
import random
import serial
import threading
import math

# === Settings ===
PORT = "COM8"
BAUD = 2000000
DT = 0.001

# === State ===
streaming = False
timestamp = 0.0
START_TIME = time.monotonic()

# PID coefficients (matching C struct names)
pid = {"kp": 1.0, "ki": 0.5, "kd": 0.1}

# Mahony filter coefficients (matching C struct)
mahony = {"kp": 2.0, "ki": 0.1}

# IMU offset state
imu_offset = {"x": 1.0, "y": 0.2, "z": 3.0}

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

    # --- PID control ---
    error = setpoint - pitch
    integral += error * DT
    derivative = (error - last_error) / DT
    last_error = error

    u = pid["kp"] * error + pid["ki"] * integral + pid["kd"] * derivative

    # --- System dynamics ---
    wn = 2.0    # rad/s natural frequency
    zeta = 0.7  # damping ratio

    acc = u - (2 * zeta * wn * pitch_rate + wn**2 * pitch)
    pitch_rate += acc * DT
    pitch += pitch_rate * DT

    return setpoint, pitch, error


def update_imu_angles():
    """Simulate realistic IMU angle changes"""
    global pitch_angle, roll_angle, angle_velocity_pitch, angle_velocity_roll
    
    t = timestamp / 1000.0
    
    base_pitch = 25.0 * math.sin(0.2 * t)
    base_roll = 20.0 * math.cos(0.17 * t)
    
    turbulence_pitch = 5.0 * math.sin(2.0 * t) + 2.5 * math.sin(5.0 * t)
    turbulence_roll = 4.0 * math.cos(2.2 * t) + 1.8 * math.sin(4.8 * t)
    
    maneuver_time = int(t / 12) * 12
    maneuver_progress = (t - maneuver_time) / 2.0
    
    if maneuver_progress < 1.0:
        maneuver_factor = 1.0 / (1.0 + math.exp(-10 * (maneuver_progress - 0.5)))
        maneuver_pitch = 45.0 * maneuver_factor * math.sin(math.pi * maneuver_progress)
        maneuver_roll = 35.0 * maneuver_factor * math.cos(math.pi * maneuver_progress)
    else:
        maneuver_pitch = 0.0
        maneuver_roll = 0.0
    
    target_pitch = base_pitch + turbulence_pitch + maneuver_pitch
    target_roll = base_roll + turbulence_roll + maneuver_roll
    
    damping = 0.92
    spring_constant = 12.0
    
    pitch_error = target_pitch - pitch_angle
    roll_error = target_roll - roll_angle
    
    angle_velocity_pitch = angle_velocity_pitch * damping + pitch_error * spring_constant * DT
    angle_velocity_roll = angle_velocity_roll * damping + roll_error * spring_constant * DT
    
    pitch_angle += angle_velocity_pitch * DT
    roll_angle += angle_velocity_roll * DT
    
    pitch_angle += random.gauss(0, 0.4)
    roll_angle += random.gauss(0, 0.4)
    
    pitch_angle = max(-180.0, min(180.0, pitch_angle))
    roll_angle = max(-180.0, min(180.0, roll_angle))
    
    return pitch_angle, roll_angle


def send_packet():
    """Send one binary data packet according to new struct format"""
    global timestamp

    timestamp = (time.monotonic() - START_TIME) * 1000.0

    sp, pv, err = update_system()
    pa, ra = update_imu_angles()
    
    packet = struct.pack("<IfffffB", 
                        int(timestamp) & 0xFFFFFFFF,
                        sp, pv, err,
                        pa, ra,
                        10)
    
    try:
        ser.write(packet)
    except serial.SerialTimeoutException:
        pass


def cli_cmd_onoff(value_str):
    if value_str.lower() == "on":
        return 1
    elif value_str.lower() == "off":
        return 0
    else:
        return -1


def cli_pid(argv):
    global pid, streaming

    if not argv:
        ser.write(f"{COLORS['ERROR']}ERR: missing arguments{COLORS['RESET']}\n".encode())
        return

    cmd = argv[0].lower()
    
    if cmd == "show":
        msg = f"P: {pid['kp']:4.2f}, I: {pid['ki']:4.2f}, D: {pid['kd']:4.2f}\n"
        ser.write(msg.encode())
        
    elif cmd == "set" and len(argv) >= 3:
        param = argv[1].lower()
        val = argv[2]
        if _is_float(val):
            value = float(val)
            if param == "p":
                pid["kp"] = value
                ser.write(f"{COLORS['INFO']}PID kP set to {value}{COLORS['RESET']}\n".encode())
            elif param == "i":
                pid["ki"] = value
                ser.write(f"{COLORS['INFO']}PID kI set to {value}{COLORS['RESET']}\n".encode())
            elif param == "d":
                pid["kd"] = value
                ser.write(f"{COLORS['INFO']}PID kD set to {value}{COLORS['RESET']}\n".encode())
            else:
                ser.write(f"{COLORS['ERROR']}ERR: unknown parameter{COLORS['RESET']}\n".encode())
        else:
            ser.write(f"{COLORS['ERROR']}ERR: invalid value{COLORS['RESET']}\n".encode())
            
    elif cmd == "get" and len(argv) >= 2:
        param = argv[1].lower()
        if param == "p":
            ser.write(f"{pid['kp']:4.2f}\n".encode())
        elif param == "i":
            ser.write(f"{pid['ki']:4.2f}\n".encode())
        elif param == "d":
            ser.write(f"{pid['kd']:4.2f}\n".encode())
        else:
            ser.write(f"{COLORS['ERROR']}ERR: unknown parameter{COLORS['RESET']}\n".encode())
            
    elif cmd == "stream" and len(argv) >= 2:
        value = cli_cmd_onoff(argv[1])
        if value == 0:
            streaming = False
            ser.write(f"{COLORS['WARN']}PID streaming OFF{COLORS['RESET']}\n".encode())
        elif value == 1:
            streaming = True
            ser.write(f"{COLORS['INFO']}PID streaming ON{COLORS['RESET']}\n".encode())
        else:
            ser.write(f"{COLORS['ERROR']}ERR: invalid on/off value{COLORS['RESET']}\n".encode())
    else:
        help_msg = "\nCMD: pid >\n\tset    - set coefs value <p|i|d> <value>\n\tget    - get coefs value <p|i|d>\n\tshow   - print coefs values\n\tstream - on/off data stream <on|off>\n"
        ser.write(help_msg.encode())


def cli_imu(argv):
    global mahony, imu_offset

    if not argv:
        ser.write(f"{COLORS['ERROR']}ERR: missing arguments{COLORS['RESET']}\n".encode())
        return

    cmd = argv[0].lower()

    if cmd == "offset" and len(argv) >= 2:
        subcmd = argv[1].lower()
        if subcmd == "set" and len(argv) >= 4:
            axis = argv[2].lower()
            val = argv[3]
            if axis in imu_offset and _is_float(val):
                imu_offset[axis] = float(val)
                ser.write(f"{COLORS['INFO']}IMU offset {axis.upper()} set to {float(val):4.2f}{COLORS['RESET']}\n".encode())
            else:
                ser.write(f"{COLORS['ERROR']}ERR: invalid axis or value{COLORS['RESET']}\n".encode())
        elif subcmd == "show":
            msg = f"X: {imu_offset['x']:4.2f}, Y: {imu_offset['y']:4.2f}, Z: {imu_offset['z']:4.2f}\n"
            ser.write(msg.encode())
        else:
            ser.write(f"{COLORS['ERROR']}ERR: offset usage: offset set <x|y|z> <value> | offset show{COLORS['RESET']}\n".encode())
        return

    if cmd == "calib":
        ser.write(f"{COLORS['INFO']}Starting gyro calibration...{COLORS['RESET']}\n".encode())
        
    elif cmd == "level":
        ser.write(f"{COLORS['INFO']}Starting level calibration wizard...{COLORS['RESET']}\n".encode())
        
    elif cmd == "mahony" and len(argv) >= 2:
        subcmd = argv[1].lower()
        if subcmd == "p" and len(argv) >= 3:
            val = argv[2]
            if _is_float(val):
                mahony["kp"] = float(val)
                ser.write(f"{COLORS['INFO']}Mahony kP set to {val}{COLORS['RESET']}\n".encode())
            else:
                ser.write(f"{COLORS['ERROR']}ERR: invalid value{COLORS['RESET']}\n".encode())
        elif subcmd == "i" and len(argv) >= 3:
            val = argv[2]
            if _is_float(val):
                mahony["ki"] = float(val)
                ser.write(f"{COLORS['INFO']}Mahony kI set to {val}{COLORS['RESET']}\n".encode())
            else:
                ser.write(f"{COLORS['ERROR']}ERR: invalid value{COLORS['RESET']}\n".encode())
        elif subcmd == "show":
            msg = f"P: {mahony['kp']:4.2f}, I: {mahony['ki']:4.2f}\n"
            ser.write(msg.encode())
        else:
            ser.write(f"{COLORS['ERROR']}ERR: mahony usage: mahony <p|i|show> <value>{COLORS['RESET']}\n".encode())
            
    elif cmd == "show":
        msg = f"P: {mahony['kp']:4.2f}, I: {mahony['ki']:4.2f}\n"
        ser.write(msg.encode())
        
    else:
        help_msg = "\nCMD: imu >\n\tcalib  - start Gyro calibration\n\tlevel  - wizard tool to calibrate min-center-max angles\n\tshow   - show filter coefficients\n\tmahony - filter coefficients <p|i> <value>\n\toffset - set or show offsets <set x|y|z <val>|show>\n"
        ser.write(help_msg.encode())


def _is_float(s: str):
    try:
        float(s)
        return True
    except:
        return False


def handle_command(cmd: str):
    parts = cmd.strip().split()
    if not parts:
        return

    if parts[0] == "pid":
        cli_pid(parts[1:])
    elif parts[0] == "imu":
        cli_imu(parts[1:])
    elif parts[0] == "help" or parts[0] == "?":
        help_msg = "\nCMD: pid >\n\tset    - set coefs value <p|i|d> <value>\n\tget    - get coefs value <p|i|d>\n\tshow   - print coefs values\n\tstream - on/off data stream <on|off>\n"
        help_msg += "\nCMD: imu >\n\tcalib  - start Gyro calibration\n\tlevel  - wizard tool to calibrate min-center-max angles\n\tshow   - show filter coefficients\n\tmahony - filter coefficients <p|i> <value>\n\toffset - set or show offsets <set x|y|z <val>|show>\n"
        ser.write(help_msg.encode())
    elif parts[0] == "status":
        msg = f"{COLORS['INFO']}System Status:{COLORS['RESET']}\n"
        msg += f"  Pitch Angle: {pitch_angle:6.2f}°\n"
        msg += f"  Roll Angle:  {roll_angle:6.2f}°\n"
        msg += f"  PID Pitch:   {pitch:6.2f}\n"
        msg += f"  Setpoint:    {setpoint:6.2f}\n"
        msg += f"  Streaming:   {'ON' if streaming else 'OFF'}\n"
        msg += f"  PID: kP={pid['kp']:4.2f}, kI={pid['ki']:4.2f}, kD={pid['kd']:4.2f}\n"
        msg += f"  Mahony: kP={mahony['kp']:4.2f}, kI={mahony['ki']:4.2f}\n"
        msg += f"  IMU Offset: X={imu_offset['x']:4.2f}, Y={imu_offset['y']:4.2f}, Z={imu_offset['z']:4.2f}\n"
        ser.write(msg.encode())
    else:
        ser.write(f"{COLORS['WARN']}Unknown command: {cmd}{COLORS['RESET']}\n".encode())


def reader_thread():
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
    messages = [
        ("INFO", "System running smoothly"),
        ("WARN", "Sensor jitter detected"),
        ("ERROR", "IMU read timeout")
    ]
    
    while True:
        time.sleep(random.uniform(3, 8))
        level, msg = random.choice(messages)
        ser.write(f"{COLORS[level]}[{level}] {msg}{COLORS['RESET']}\n".encode())


threading.Thread(target=reader_thread, daemon=True).start()
threading.Thread(target=log_thread, daemon=True).start()

print(f"Enhanced emulator running on {PORT} @ {BAUD}")
print(f"Packet size: {struct.calcsize('<I fff ff B')} bytes")
print("Commands matching C firmware:")
print("  pid set <p|i|d> <value>")
print("  pid get <p|i|d>")
print("  pid show")
print("  pid stream <on|off>")
print("  imu calib")
print("  imu level")
print("  imu mahony <p|i> <value>")
print("  imu mahony show")
print("  imu offset set <x|y|z> <value>")
print("  imu offset show")
print("  help or ?")
print("  status (simulator only)")

next_time = time.perf_counter()
interval = DT
sent_count = 0
report_time = time.perf_counter()

try:
    while True:
        if streaming:
            now = time.perf_counter()
            if now < next_time:
                to_sleep = next_time - now
                if to_sleep > 0.002:
                    time.sleep(to_sleep - 0.001)
                else:
                    while time.perf_counter() < next_time:
                        pass
            send_packet()
            sent_count += 1
            next_time += interval
            if time.perf_counter() - next_time > 0.1:
                next_time = time.perf_counter() + interval
        else:
            time.sleep(0.05)

        if time.perf_counter() - report_time >= 1.0:
            sent_count = 0
            report_time += 1.0
except KeyboardInterrupt:
    pass
