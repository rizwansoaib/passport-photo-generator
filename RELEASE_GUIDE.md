# How to Create a Release

This guide explains how to use the automated build and release workflow for Passport Photo Generator.

## Quick Start

### Option 1: Automatic Release (Recommended)

1. Update version in `package.json`:
   ```json
   {
     "version": "2.1.0"
   }
   ```

2. Commit and push:
   ```bash
   git add package.json
   git commit -m "Bump version to 2.1.0"
   git push
   ```

3. Create and push tag:
   ```bash
   git tag v2.1.0
   git push origin v2.1.0
   ```

4. GitHub Actions will automatically:
   - Build for macOS (Intel & Apple Silicon)
   - Build for Windows (32-bit & 64-bit)
   - Build for Linux (AppImage, DEB, Snap)
   - Generate SHA256 checksums
   - Create GitHub Release with all artifacts

### Option 2: Manual Build (Testing)

1. Go to GitHub → Actions tab
2. Select "Build Desktop Apps" workflow
3. Click "Run workflow"
4. Check "Create a draft release" for testing
5. Click "Run workflow" button
6. Review and publish draft when ready

## What Gets Built

### macOS Artifacts
- `Passport Photo Generator-{version}-mac-x64.dmg` - Intel Macs
- `Passport Photo Generator-{version}-mac-arm64.dmg` - Apple Silicon
- `Passport Photo Generator-{version}-mac-x64.zip` - Intel Macs (alternate)
- `Passport Photo Generator-{version}-mac-arm64.zip` - Apple Silicon (alternate)
- `*.sha256` - Checksums for each file
- `latest-mac.yml` - Auto-update metadata

### Windows Artifacts
- `Passport Photo Generator Setup {version}.exe` - 64-bit installer
- `Passport Photo Generator Setup {version}-ia32.exe` - 32-bit installer
- `Passport Photo Generator {version}.exe` - 64-bit portable
- `Passport Photo Generator {version}-ia32.exe` - 32-bit portable
- `*.sha256` - Checksums for each file

### Linux Artifacts
- `Passport Photo Generator-{version}.AppImage` - Universal package
- `passport-photo-generator_{version}_amd64.deb` - Debian/Ubuntu
- `passport-photo-generator_{version}_amd64.snap` - Snap package
- `*.sha256` - Checksums for each file
- `latest-linux.yml` - Auto-update metadata

## Features

### Security
✅ SHA256 checksums for all downloads
✅ Verifiable artifact integrity
✅ Secure GitHub Actions workflow

### Auto-Updates
✅ Electron auto-updater support
✅ Automatic update notifications
✅ Seamless update installation

### Flexibility
✅ Automatic releases on tag push
✅ Manual workflow trigger option
✅ Draft release mode for testing
✅ Multi-platform parallel builds

## Troubleshooting

### Build Failed
1. Check Actions tab for error logs
2. Verify package.json version format
3. Ensure all assets exist (icons, etc.)
4. Check if dependencies are up to date

### Artifacts Missing
1. Wait for all matrix jobs to complete
2. Check artifact upload paths
3. Verify build succeeded for that platform

### Release Not Created
1. Ensure you pushed a tag (not just committed)
2. Tag must start with 'v' (e.g., v2.0.0)
3. Check workflow permissions

## Best Practices

1. **Test Before Release**
   - Run manual workflow with draft release
   - Test installers on each platform
   - Verify checksums

2. **Version Numbering**
   - Use semantic versioning (MAJOR.MINOR.PATCH)
   - Tag format: v{version} (e.g., v2.1.0)
   - Keep package.json version in sync

3. **Release Notes**
   - Document changes in release description
   - Highlight new features and bug fixes
   - Include upgrade instructions if needed

## See Also

- [BUILD.md](../BUILD.md) - Detailed build instructions
- [.github/RELEASE.md](RELEASE.md) - Complete release guide
- [README.md](../README.md) - Project documentation
