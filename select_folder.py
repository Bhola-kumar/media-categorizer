import sys
import os
import json
import subprocess

def pick_folder():
    # Method 1: Try Tkinter topmost dialog first
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        root.lift()
        root.focus_force()
        folder = filedialog.askdirectory(title="Select Local Directory")
        root.destroy()
        if folder:
            print(json.dumps({"success": True, "path": os.path.abspath(folder)}), flush=True)
            return
    except Exception as e:
        pass

    # Method 2: Windows PowerShell FolderBrowserDialog fallback
    try:
        ps_script = (
            "Add-Type -AssemblyName System.Windows.Forms; "
            "$d = New-Object System.Windows.Forms.FolderBrowserDialog; "
            "$d.Description = 'Select Local Directory'; "
            "if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.SelectedPath }"
        )
        res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True, timeout=60)
        if res.returncode == 0 and res.stdout.strip():
            path = res.stdout.strip().splitlines()[-1].strip()
            if path and os.path.exists(path):
                print(json.dumps({"success": True, "path": os.path.abspath(path)}))
                return
    except Exception:
        pass

    print(json.dumps({"success": False, "message": "Cancelled or no folder selected"}))

if __name__ == "__main__":
    pick_folder()
