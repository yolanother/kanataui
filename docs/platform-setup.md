# KanataUI Platform Setup

## Windows

1. Download the `.exe` (NSIS) or `.msi` installer from the releases page.
2. Run the installer. It installs to your user directory (`%LOCALAPPDATA%`) by default -- no admin rights required.
3. Launch KanataUI from the Start Menu.
4. (Optional) Enable "Launch at startup" in Settings to have KanataUI start automatically when you log in.

### kanata binary

KanataUI will attempt to locate `kanata.exe` in your system PATH. If kanata is not installed:

1. Download kanata from https://github.com/jtroo/kanata/releases
2. Place `kanata.exe` somewhere in your PATH (e.g. `C:\Users\<you>\bin\`)
3. Or configure the path to kanata in KanataUI settings.

## macOS

1. Download the `.dmg` file from the releases page.
2. Open the `.dmg` and drag KanataUI to your Applications folder.
3. On first launch, macOS may prompt you to allow the app. Go to **System Preferences > Security & Privacy > General** and click "Open Anyway".
4. **Important:** kanata requires accessibility permissions to intercept keyboard input. Go to **System Preferences > Security & Privacy > Privacy > Accessibility** and add KanataUI.
5. (Optional) Enable "Launch at startup" in Settings to add a LaunchAgent that starts KanataUI on login.

### kanata binary

KanataUI will attempt to locate `kanata` in your PATH. If kanata is not installed:

1. Install via Homebrew: `brew install kanata`
2. Or download from https://github.com/jtroo/kanata/releases and place in `/usr/local/bin/`

### Code signing

For distribution outside the Mac App Store, the app should be code-signed and notarized. This requires an Apple Developer account and the following environment variables during build:

- `APPLE_CERTIFICATE` - Base64-encoded .p12 certificate
- `APPLE_CERTIFICATE_PASSWORD` - Certificate password
- `APPLE_SIGNING_IDENTITY` - Certificate identity name
- `APPLE_ID` - Apple ID email
- `APPLE_PASSWORD` - App-specific password for notarization
- `APPLE_TEAM_ID` - Apple Developer Team ID

## Linux (Ubuntu/Debian)

### Install via .deb package

1. Download the `.deb` file from the releases page.
2. Install: `sudo dpkg -i kanataui_*.deb`
3. Launch from your application menu or run `kanataui` from a terminal.

### Install via AppImage

1. Download the `.AppImage` file from the releases page.
2. Make it executable: `chmod +x KanataUI_*.AppImage`
3. Run it: `./KanataUI_*.AppImage`

### uinput permissions (required)

kanata on Linux intercepts keyboard input via the uinput kernel module. You must configure permissions:

```bash
# Create the uinput group (if it doesn't exist)
sudo groupadd uinput

# Add your user to the input and uinput groups
sudo usermod -aG input $USER
sudo usermod -aG uinput $USER

# Create a udev rule for uinput device permissions
sudo tee /etc/udev/rules.d/99-uinput.rules > /dev/null <<'EOF'
KERNEL=="uinput", MODE="0660", GROUP="uinput", OPTIONS+="static_node=uinput"
EOF

# Ensure the uinput module loads at boot
sudo tee /etc/modules-load.d/uinput.conf > /dev/null <<'EOF'
uinput
EOF

# Load the module now
sudo modprobe uinput

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

**You must log out and log back in** (or reboot) for group membership changes to take effect.

### kanata binary

KanataUI will attempt to locate `kanata` in your PATH. If kanata is not installed:

1. Download from https://github.com/jtroo/kanata/releases
2. Place in `/usr/local/bin/` and make executable: `chmod +x /usr/local/bin/kanata`

### Autostart

Enable "Launch at startup" in KanataUI Settings. This creates a desktop autostart entry in `~/.config/autostart/`.

## Config file location

KanataUI stores its configuration in the platform-standard location:

| Platform | Path |
|----------|------|
| Windows  | `%APPDATA%\kanataui\` |
| macOS    | `~/Library/Application Support/kanataui/` |
| Linux    | `~/.config/kanataui/` |
