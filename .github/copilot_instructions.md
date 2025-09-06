# Copilot Instructions 

## Project Overview 
This project is a frontend application for interacting with a microcontroller board via USB (COM port). The application's main responsibilities are: 
- Reading binary data packets from the board. 
- Displaying real-time data on dual charts with expandable canvas mode. 
- Sending and receiving control commands through the serial port (PID parameters, Mahony filter parameters, start/stop reading). 
- Providing a command-line console that behaves like a real serial terminal (e.g., PuTTY/TeraTerm). 

The frontend stack: **React + Vite (JavaScript)**. Architecture rule: all UI parts should be separated into **independent components**, and state should be managed with **slices (context/store)**. The backend is a **Python Flask app**, packaged into a single-file executable with **PyInstaller**, running in the system tray and serving both the API and the frontend. 

--- 

## UI Layout and Components 

### Main Layout 
- **Left side**: Charts area (expandable in canvas mode) 
- **Right side**: Collapsible control panels 
- **Burger menu**: Toggle to hide/show right panels for full canvas mode 

### 1. Chart Areas 

#### Top Chart (IMU Angles) 
- **Smaller chart** (compressed Y-axis) for `pitch_angle` and `roll_angle` (-180 to 180 degrees) 
- **Clear button** (icon) in top-right corner of chart 
- **Packet frequency indicator** showing incoming data rate (e.g., "125 Hz") 

#### Bottom Chart (PID Data) 
- **Larger chart** for `setpoint`, `pitch`, and `error` vs. `timestamp` 
- **Clear button** (icon) in top-right corner of chart 
- **Packet frequency indicator** showing incoming data rate 

#### Angle Indicators 
- **Two circular gauges** to the right of the top chart 
- Display `pitch_angle` and `roll_angle` as directional indicators 
- Visual representation of -180° to 180° range 

#### Time Window Control 
- **Slider above all charts** (e.g., 10s–60s time window) 
- Controls both charts simultaneously 

### 2. Right Panel (Collapsible) 

#### Serial Connection Controls 
- COM port dropdown 
- **Connect button** (changes to **Disconnect**) 
- **Start/Stop button** that toggles streaming (sends `pid stream on/off` to the board) 

#### PID Controls 
- Three inputs for PID coefficients (P, I, D) 
- Buttons: 
  - **Set** → sends `pid set p|i|d <value>` commands 
  - **Get** → sends `pid show` and updates inputs from received PID values (format: %4.2f)

#### Mahony Filter Controls 
- Two inputs for Mahony filter coefficients (P, I) 
- Buttons: 
  - **Set** → sends `imu mahony p|i <value>` commands 
  - **Get** → sends `imu mahony show` and updates inputs from received Mahony values (format: %4.2f) 

#### Command Console 
- Styled like a real terminal (PuTTY/TeraTerm): 
  - No timestamps or extra metadata 
  - Monospaced font, dark background 
  - Supports **VT100 color codes** (parse `\x1b[...m` sequences and render colored text, reset on `\x1b[0m)` 
  - Input line for manual commands 
  - Shows all incoming/outgoing serial messages **except binary chart data**, which is filtered out 

### 3. Canvas Mode 
- **Burger menu button** to toggle right panel visibility 
- When panels are hidden: 
  - Charts, slider, and angle indicators expand to fill available space 
  - Full canvas mode for data visualization 
- When panels are shown: 
  - Right side shows all control interfaces 
  - Charts occupy left portion of screen 

--- 

## Communication Protocol 

### Data Packets (binary)

```c
typedef struct {
    uint32_t timestamp;     // milliseconds time
    
    // Data stream for PID controller
    struct {
        float setpoint;     // data from remote
        float pitch;        // data from IMU  
        float error;        // PID controller error
    } pid;
    
    // Data stream for IMU axis
    struct {
        float pitch_angle;  // -180 to 180 degrees
        float roll_angle;   // -180 to 180 degrees  
    } angle;
    
    uint8_t end;           // '\n'
} __attribute__((__packed__)) sys_telem_t;
```

### CLI Commands 
- **PID management** 
  - `pid` → prints usage/help for subcommands 
  - `pid set p <P>` / `pid set i <I>` / `pid set d <D>` → set coefficient 
  - `pid show` → print all coefficients in format: `P: 0000.00, I: 0000.00, D: 0000.00` (%4.2f) 
- **Mahony filter management**
  - `imu mahony p <P>` / `imu mahony i <I>` → set coefficient
  - `imu mahony show` → print coefficients in format: `P: 0000.00, I: 0000.00` (%4.2f)
- **Streaming** 
  - `pid stream on` → enable streaming 
  - `pid stream off` → disable streaming 
- **Manual commands** 
  - Any text typed in the console is sent as-is and displayed back with board response 
  - The ones above are just the main commands the GUI needs; the board may support additional commands 

--- 

## Implementation Notes 
- Each UI part must be a **standalone React component**: 
  - `ChartArea`, `PIDChart`, `AngleChart`, `AngleGauges`, `PIDControls`, `MahonyControls` `SerialControls`, `CommandConsole`, `CanvasToggle`, etc.
- Use slices for state management: 
  - `serialSlice`, `chartSlice`, `pidSlice`, `mahonySlice`, `consoleSlice`, `uiSlice` (for canvas mode state) 
- Serial communication handled in **Python backend**: 
  - Stream binary data to frontend via **WebSocket** 
  - Calculate and send packet frequency information 
- Console text rendering must strip or parse ANSI escape codes for colors 
- **Responsive layout**: 
  - Charts expand/contract based on right panel visibility 
  - Maintain aspect ratios and readability in both modes 
  - Don't use hardcoded pixel values. We need responsiveness for different screen sizes (but not for mobile) 
- PyInstaller packaging: 
  - Single .exe file 
  - App runs in system tray with icon (same favicon as webapp) 
  - Serves static frontend files bundled with the backend 

--- 

## Typical Workflow 
1. User opens the GUI (tray app) 
2. Selects a COM port and presses **Connect** 
3. Presses **Start** (sends `pid stream` on) 
4. **Dual charts update in real time**: 
   - Top chart: A bit shorter chart with IMU angles with circular gauges to the right of it 
   - Bottom: Chart with PID control data 
5. User can toggle **canvas mode** using burger menu for full-screen charts 
6. User sets/gets PID values through control panel 
7. User sets/gets Mahony filter values through control panel
8. Console available for manual commands and colored log output 
9. **Clear buttons** allow individual chart reset 
10. **Packet frequency** displays real-time data rate 
11. **Stop** → `pid stream off`; **Disconnect** closes the port 

## For agents 
1. Terminal used is powershell, not cmd. 
2. When providing code snippets, add file name and location.