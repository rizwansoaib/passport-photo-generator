# Release Guide

This document explains how to create and publish releases for Passport Photo Generator.

## Automated Release Process

The repository uses GitHub Actions to automatically build desktop apps for all platforms when a new version tag is pushed.

### Creating a Release

1. **Update Version**
   
   Update the version in `package.json`:
   ```json
   {
     "version": "2.1.0"
   }
   ```

2. **Commit Changes**
   
   ```bash
   git add package.json
   git commit -m "Bump version to 2.1.0"
   git push
   ```

3. **Create and Push Tag**
   
   ```bash
   git tag v2.1.0
   git push origin v2.1.0
   ```

4. **Automated Build**
   
   The GitHub Actions workflow will automatically:
   - Build apps for macOS (Intel & Apple Silicon)
   - Build apps for Windows (32-bit & 64-bit)
   - Build apps for Linux (AppImage, DEB, Snap)
   - Generate checksums for all files
   - Create a GitHub Release with all artifacts

### Manual Release Build

You can also manually trigger a release build:

1. Go to **Actions** tab in GitHub
2. Select **Build Desktop Apps** workflow
3. Click **Run workflow**
4. Choose options:
   - Select branch
   - Check "Create a draft release" if you want to review before publishing

## Build Artifacts

### macOS Builds
- `Passport Photo Generator-{version}-mac-x64.dmg` - DMG installer for Intel Macs
- `Passport Photo Generator-{version}-mac-arm64.dmg` - DMG installer for Apple Silicon Macs
- `Passport Photo Generator-{version}-mac-x64.zip` - ZIP archive for Intel Macs
- `Passport Photo Generator-{version}-mac-arm64.zip` - ZIP archive for Apple Silicon Macs
- Checksums: `.sha256` files for each

### Windows Builds
- `Passport Photo Generator Setup {version}.exe` - NSIS installer (64-bit)
- `Passport Photo Generator Setup {version}-ia32.exe` - NSIS installer (32-bit)
- `Passport Photo Generator {version}.exe` - Portable executable (64-bit)
- `Passport Photo Generator {version}-ia32.exe` - Portable executable (32-bit)
- Checksums: `.sha256` files for each

### Linux Builds
- `Passport Photo Generator-{version}.AppImage` - Universal Linux package
- `passport-photo-generator_{version}_amd64.deb` - Debian/Ubuntu package
- `passport-photo-generator_{version}_amd64.snap` - Snap package
- Checksums: `.sha256` files for each

### Auto-Update Metadata
- `latest.yml` - Auto-update metadata for macOS and Linux
- `latest-linux.yml` - Auto-update metadata for Linux
- `latest-mac.yml` - Auto-update metadata for macOS

## Verifying Checksums

Users can verify downloaded files using checksums:

### macOS/Linux
```bash
shasum -a 256 -c "Passport Photo Generator-2.0.0-mac-x64.dmg.sha256"
```

### Windows (PowerShell)
```powershell
$hash = (Get-FileHash "Passport Photo Generator Setup 2.0.0.exe" -Algorithm SHA256).Hash
$expected = Get-Content "Passport Photo Generator Setup 2.0.0.exe.sha256"
$hash -eq $expected.Split(" ")[0]
```

## Local Build Testing

Before creating a release, test builds locally:

### All Platforms (if supported by your OS)
```bash
npm run dist:all
```

### Specific Platform
```bash
npm run dist:mac    # macOS
npm run dist:win    # Windows
npm run dist:linux  # Linux
```

### Just Package (no distribution)
```bash
npm run pack
```

## Release Checklist

- [ ] Update version in `package.json`
- [ ] Update CHANGELOG.md (if exists)
- [ ] Test build locally
- [ ] Commit and push changes
- [ ] Create and push version tag
- [ ] Wait for GitHub Actions to complete
- [ ] Verify all artifacts are present in the release
- [ ] Test download and installation on each platform
- [ ] Publish release notes
- [ ] Announce release on relevant channels

## Troubleshooting

### Build Fails on GitHub Actions

1. Check the Actions logs for errors
2. Verify package.json build configuration
3. Ensure all required assets exist (icons, etc.)
4. Check if dependencies are properly installed

### Missing Artifacts

If some build artifacts are missing:
1. Check the workflow matrix includes all platforms
2. Verify the artifact upload paths in the workflow
3. Ensure the build completed successfully for that platform

### Auto-Update Not Working

1. Verify `publish` configuration in package.json
2. Check that `latest*.yml` files are included in the release
3. Ensure GitHub token has proper permissions

## Security

- All releases include SHA256 checksums for verification
- Code signing is recommended for production releases
- See [BUILD.md](../BUILD.md) for code signing instructions

## Support

For issues with releases:
- Check [GitHub Issues](https://github.com/rizwansoaib/passport-photo-generator/issues)
- Review [BUILD.md](../BUILD.md) for detailed build instructions
