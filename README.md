## Usage
1. Download the latest version from the [Releases](https://github.com/MoonLighTingPY/rws-pid-webgui/releases) page.
2. Run `RWS-Pid-Tuner-GUI.exe`. It will automatically open the GUI in your default web browser.
3. Select a COM port and connect to your device.
4. Click **Start Streaming** to visualize `pitch`, `setpoint`, and `error` on the chart.
5. Adjust PID values in real-time or use the console for manual commands.

- The GUI can be reopened from the system tray. An icon will appear there, allowing you to right-click to reopen the GUI or exit the application completely.

> ## ⚠️ Antivirus Warning
>
> Your antivirus might flag this application as malicious. 
> This is a **false positive** caused by the packaging method (PyInstaller)
>
> If you're concerned, you can build from source using the instructions below:

## Build from Source

1. Navigate to the `/backend` directory.

2. Run the build script:

   ```sh
   build.bat
   ```

3. The executable will be generated at:

   ```
   ~/backend/RWS-Pid-Tuner-GUI.exe
   ```
