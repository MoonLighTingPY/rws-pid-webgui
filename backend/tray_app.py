import sys
import os
import socket
import threading
import time
import webbrowser
from PIL import Image
import pystray
import ctypes

# Single instance guard using local TCP port
SINGLE_INSTANCE_PORT = 56789
BACKEND_PORT = 5000

def start_backend():
    # Import here so pyinstaller bundles start_backend and dependencies
    from start_backend import app  # noqa
    # Run flask without reloader
    app.run(host="127.0.0.1", port=BACKEND_PORT, threaded=True, use_reloader=False)

def open_gui():
    webbrowser.open(f"http://127.0.0.1:{BACKEND_PORT}", new=1)

def main():
    # When running from a PyInstaller onefile exe, resources are in sys._MEIPASS
    base_dir = getattr(sys, "_MEIPASS", os.path.dirname(__file__))
    # Start backend server thread
    t = threading.Thread(target=start_backend, daemon=True)
    t.start()

    # Wait a moment for server to start then open browser
    threading.Thread(target=lambda: (time.sleep(1.2), open_gui()), daemon=True).start()

    # Tray icon setup (icon is stored under backend/data/line-chart.ico and bundled)
    icon_path = os.path.join(base_dir, "web", "line-chart.ico")
    if not os.path.exists(icon_path):
        # fallback: create simple blank image
        image = Image.new("RGBA", (64, 64), (30, 144, 255, 255))
    else:
        image = Image.open(icon_path)

    def on_open(icon, item):
        open_gui()

    def on_exit(icon, item):
        # Graceful exit
        icon.visible = False
        icon.stop()
        os._exit(0)

    menu = pystray.Menu(
        pystray.MenuItem("Open GUI", on_open),
        pystray.MenuItem("Exit", on_exit)
    )

    tray_icon = pystray.Icon("RWS Pid-Tuner GUI", image, "RWS Pid-Tuner GUI", menu)
    tray_icon.run()

if __name__ == "__main__":
    main()