import struct
import time
import random
import serial

PORT = "COM7"
BAUD = 115200

ser = serial.Serial(PORT, BAUD)

timestamp = 0

while True:
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
    time.sleep(0.02)
