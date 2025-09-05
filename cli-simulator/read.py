import serial
import struct

ser = serial.Serial("COM9", 115200)

while True:
    data = ser.read(17)  # читаємо рівно один пакет
    ts, sp, pitch, err, end = struct.unpack("<IfffB", data)
    print(ts, sp, pitch, err, end)
