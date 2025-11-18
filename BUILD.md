# Building Desktop Apps

This guide explains how to build the Passport Photo Generator desktop app for macOS, Windows, and Linux.

## Prerequisites

- **Node.js** 18.x or later
- **npm** 9.x or later

### Platform-Specific Requirements

#### macOS
- macOS 10.13 or later
- Xcode Command Line Tools (optional, for codesigning)

#### Windows
- Windows 10 or later
- No additional requirements for building

#### Linux
- Ubuntu 18.04 or later (or equivalent)
- Required packages:
  ```bash
  sudo apt-get install -y build-essential
  ```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run in Development Mode

```bash
npm start
# or for development with DevTools open
npm run dev
```

### 3. Build for Current Platform

```bash
# Build unpacked directory (faster, for testing)
npm run pack

# Build distributable packages
npm run dist
```

## Building for Specific Platforms

### Build for macOS

```bash
npm run dist:mac
```

**Output formats:**
- `dist/*.dmg` - DMG installer
- `dist/*.zip` - ZIP archive

**Architectures:**
- Intel (x64)
- Apple Silicon (arm64)

### Build for Windows

```bash
npm run dist:win
```

**Output formats:**
- `dist/*.exe` - NSIS installer
- `dist/*-portable.exe` - Portable executable

**Architectures:**
- 32-bit (ia32)
- 64-bit (x64)

### Build for Linux

```bash
npm run dist:linux
```

**Output formats:**
- `dist/*.AppImage` - Universal Linux package
- `dist/*.deb` - Debian/Ubuntu package
- `dist/*.snap` - Snap package

**Architecture:**
- 64-bit (x64)

### Build for All Platforms

```bash
npm run dist:all
```

**Note:** Cross-platform building has limitations:
- macOS can build for macOS, Linux, and Windows
- Linux can build for Linux and Windows
- Windows can build for Windows only

## Distribution

### Code Signing

For production releases, you should sign your applications:

#### macOS
1. Get an Apple Developer ID certificate
2. Set environment variables:
   ```bash
   export CSC_LINK=/path/to/certificate.p12
   export CSC_KEY_PASSWORD=your-password
   ```

#### Windows
1. Get a code signing certificate
2. Set environment variables:
   ```bash
   export CSC_LINK=/path/to/certificate.pfx
   export CSC_KEY_PASSWORD=your-password
   ```

### Creating a Release

1. Update version in `package.json`
2. Build for all platforms: `npm run dist:all`
3. Upload artifacts from `dist/` to GitHub Releases
4. Tag the release with the version number

## File Structure

After building, the `dist/` directory will contain:

```
dist/
├── linux-unpacked/              # Unpacked Linux app (from npm run pack)
├── Passport Photo Generator-2.0.0.AppImage
├── passport-photo-generator_2.0.0_amd64.deb
├── passport-photo-generator_2.0.0_amd64.snap
├── Passport Photo Generator-2.0.0-mac-x64.dmg
├── Passport Photo Generator-2.0.0-mac-arm64.dmg
├── Passport Photo Generator Setup 2.0.0.exe
├── Passport Photo Generator 2.0.0.exe (portable)
└── builder-debug.yml
```

## Troubleshooting

### Build Errors

**Error: Cannot find module 'electron'**
```bash
npm install
```

**Error: EACCES permission denied**
```bash
sudo chown -R $(whoami) ~/.npm
```

### macOS Signing Issues

If you encounter signing errors on macOS:
```bash
# Skip notarization for testing
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run dist:mac
```

### Linux Dependencies

If electron-builder fails on Linux:
```bash
sudo apt-get install -y libxtst6 libxss1 libgtk-3-0 libnotify4 libgconf-2-4 \
  libnss3 libxkbcommon0 libsecret-1-0 libasound2
```

## Configuration

Build configuration is in `package.json` under the `build` key:

```json
{
  "build": {
    "appId": "com.rizwansoaib.passportphoto",
    "productName": "Passport Photo Generator",
    "directories": {
      "output": "dist"
    },
    ...
  }
}
```

To customize:
- Change `appId` for your own distribution
- Modify `productName` to change the app display name
- Update `icon` paths to use custom icons
- Add/remove platforms or architectures from targets

## CI/CD Integration

You can integrate building into your CI/CD pipeline:

### GitHub Actions Example

```yaml
name: Build Desktop Apps

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm install
      - run: npm run dist
      
      - uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: dist/*
```

## Resources

- [electron-builder Documentation](https://www.electron.build/)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Code Signing Guide](https://www.electron.build/code-signing)

## License

MIT License - See [LICENSE](LICENSE) file
