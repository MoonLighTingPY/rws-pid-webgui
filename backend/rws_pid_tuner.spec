# PyInstaller spec to bundle tray_app.py into a single windowed exe
# Includes backend/web (frontend build) and backend/data/line-chart.ico

# -*- mode: python -*-
import os
import sys
from pathlib import Path

block_cipher = None

# Get the directory where this spec file is located
spec_dir = os.path.dirname(os.path.abspath(__name__))
base_dir = Path(spec_dir)

# Collect all files under web/ (if present) into datas with relative web/ prefix
datas = []
web_dir = base_dir / "web"
if web_dir.exists():
    for root, _, files in os.walk(str(web_dir)):
        for f in files:
            src = os.path.join(root, f)
            # destination path inside bundle: web/<relative path>
            rel_dir = os.path.relpath(root, str(web_dir))
            dest_dir = os.path.join("web", rel_dir) if rel_dir != "." else "web"
            datas.append((src, dest_dir))

# Add icon file
icon_src = str(base_dir / "web" / "line-chart.ico")

a = Analysis(
    ['tray_app.py'],
    pathex=[str(base_dir)],
    binaries=[],
    datas=datas,
    hiddenimports=[
        'serial',
        'serial.tools.list_ports',
        'flask',
        'flask_cors',
        'pystray',
        'PIL',
        'PIL.Image',
        'win32gui',
        'win32con',
        'threading',
        'queue',
        'struct',
        'json'
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'numpy',
        'scipy',
        'pandas',
        'jupyter',
        'IPython',
        'pytest',
        'setuptools',
        'distutils'
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='RWS-Pid-Tuner-GUI',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=icon_src,
    version_file=None,
    uac_admin=False,
    uac_uiaccess=False
)

# Remove the COLLECT section entirely for onefile build