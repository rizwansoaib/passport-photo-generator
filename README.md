# 📸 Free Passport Photo Generator

**Create professional passport photos instantly - 100% free, offline, and private!**

[![Version](https://img.shields.io/badge/Version-2.0.0-purple?style=for-the-badge)](https://github.com/rizwansoaib/passport-photo-generator)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-blue?style=for-the-badge)](#)

Best free passport photo maker for India, USA, Canada, UK, Schengen, China and 200+ countries.

---

## ✨ Features

- **100% Free** - No costs, subscriptions, or watermarks
- **100% Private** - Photos never leave your device
- **Works Offline** - PWA with complete offline support
- **Desktop Apps** - Native apps for Mac, Windows, and Linux
- **No Sign-up Required** - Start instantly
- **300 DPI Quality** - Professional print-ready output
- **200+ Countries** - All passport photo sizes supported

### 🎨 Editing Tools

- Brightness adjustment
- Contrast control
- Saturation tuning
- Exposure settings
- Sharpness enhancement
- Blur effects
- One-click Auto Enhance
- More filter presets — Grayscale, Sepia, Vintage, Cool, Warm, Vivid + Vignette effect

### 🧠 AI-Powered Tools (New)

- **AI background removal** with instant color swap (white, blue, red, grey or any custom color) — all on-device
- **Face detection auto-crop** — uploaded photos are automatically centered and cropped around the detected face
- **Before/After comparison slider** to see your edits side-by-side with the original
- **Batch processing** — apply the same crop, background and filters to multiple photos at once, then export as ZIP or a multi-page PDF
- **Multi-language interface** — English, Español, Français, हिन्दी, Deutsch, Português

### 👔 AI Professional Attire Studio (New)

- **Country & Document presets** for India, USA and International/ICAO-style documents — each with its own dimensions, framing guidance, background recommendation and available attire categories
- **Professional attire collections** — India (formal shirts, blazers, suits, coats, ties, bow ties) and USA (shirts, blouse, blazer, suits, jackets, coats, ties, bow ties), each with multiple colour presets plus a custom colour picker
- **Hijab & Headscarf Studio** — six styles (simple wrapped, professional front-frame, modest headscarf, rounded, formal, conservative ID-photo) in black, white, navy, gray, beige, cream and dark blue
- **Face Safety Mask** — MediaPipe Face Landmarker geometry guarantees clothing and hijab layers can never cover the eyes, eyebrows, nose, mouth or chin
- **Automatic shoulder/neck alignment** — attire is scaled, rotated and positioned from detected face geometry, with manual scale/position fine-tuning
- **Non-destructive layers** (Clothing → Hijab, independent visibility/opacity/reset) with automatic lighting harmonization and edge feathering, on top of the original, unmodified photo
- **Smart Attire Recommendation** for the selected country/document, always paired with a clear disclaimer that final requirements depend on the issuing authority
- **Enhanced AI Photo Doctor** — 0-100 score covering face visibility, eye openness, head pose, centering, framing, lighting, background, sharpness, resolution and attire quality
- **Instant "Reject & Restore Original"** — one click removes all AI attire and returns to your untouched photo
- 🔒 **100% on-device**: no photo, face landmark or biometric data is ever uploaded; this is a styling *preview*, not an official government/document requirement

### 🤖 AI Live Camera Studio

- **Live camera capture** with front/rear switching and resolution selection
- **Real-time face detection & coaching** ("move closer", "straighten your head", "hold still"…) powered by on-device MediaPipe face landmarks
- **Passport-preset overlay** — boundary, center line, eye-line and safe-area guides matched to your selected country size
- **Live quality score (0-100)** for brightness, sharpness, contrast, background uniformity, face size, centering and pose
- **Smart Auto-Crop** centers and sizes the photo automatically from detected facial landmarks
- **Smart Auto Capture** — a 3/5/10s countdown fires automatically once framing is correct and stable
- 🔒 **100% on-device**: no image, video frame, or face/landmark data is ever uploaded to a server

---

## 🌍 Supported Countries

| Country | Size | Use For |
|---------|------|---------|
| India | 35×45mm | Passport, Visa, Aadhaar |
| UK | 35×45mm | Passport, Visa, License |
| USA | 51×51mm (2×2") | Passport, Visa, Green Card |
| Canada | 50×70mm | Passport, PR Card, Visa |
| Schengen | 35×45mm | European Visa |
| China | 33×48mm | Chinese Visa |
| Custom | 20-150mm | Any country |

---

## 🚀 Quick Start

### Web Version

```bash
# Clone the repository
git clone https://github.com/rizwansoaib/passport-photo-generator.git

# Navigate to directory
cd passport-photo-generator

# Open in browser
open index.html
```

### Desktop App

**Download Pre-built Apps:**

Download the latest desktop app for your platform from the [Releases](https://github.com/rizwansoaib/passport-photo-generator/releases) page:

- **macOS**: `.dmg` or `.zip` (supports both Intel and Apple Silicon)
- **Windows**: `.exe` installer or portable `.exe` (32-bit and 64-bit)
- **Linux**: `.AppImage`, `.deb`, or `.snap`

All releases include SHA256 checksums for security verification.

**Build from Source:**

```bash
# Clone the repository
git clone https://github.com/rizwansoaib/passport-photo-generator.git

# Navigate to directory
cd passport-photo-generator

# Install dependencies
npm install

# Run the app
npm start

# Build for your platform
npm run dist

# Or build for all platforms
npm run dist:all
```

For detailed build instructions and release process, see [BUILD.md](BUILD.md) and [.github/RELEASE.md](.github/RELEASE.md).

### Usage

**Simple Mode (3 steps):**
1. Upload photo
2. Select country size
3. Download PDF

**Advanced Editor (full control):**
1. Upload photo
2. Crop precisely with Cropper.js
3. Apply adjustments (brightness, contrast, etc.)
4. Auto enhance
5. Select size and photo count
6. Generate A4 layout
7. Export as PDF or JPG

---

## 📐 Project Structure

```
passport-photo-generator/
├── index.html              # Simple mode
├── editor.html             # Advanced editor
├── manifest.json           # PWA config
├── service-worker.js       # Offline support
├── main.js                 # Electron main process
├── preload.js              # Electron preload script
├── package.json            # Node.js dependencies and build config
├── robots.txt              # SEO
├── sitemap.xml             # Sitemap
├── humans.txt              # Credits
├── assets/
│   ├── icon.svg           # App icon (SVG)
│   └── icon.png           # App icon (PNG)
├── css/
│   └── styles.css         # Main styles (1500+ lines)
└── js/
    ├── app.js             # Simple mode logic
    ├── editor.js          # Advanced editor
    ├── photoUpload.js     # File upload handler
    ├── canvasRenderer.js  # Canvas rendering (300 DPI)
    └── pdfGenerator.js    # PDF generation
```

---

## 🛠️ Technology Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| **Libraries** | Cropper.js v1.6.1, jsPDF v2.5.1 |
| **Desktop** | Electron (cross-platform desktop apps) |
| **Build Tools** | electron-builder (multi-platform packaging) |
| **Web APIs** | Canvas API, File API, Service Worker |
| **Features** | PWA, Offline Support, Responsive Design |

---

## 📱 Platform Support

### Web Browsers

| Browser | Version | PWA Support |
|---------|---------|-------------|
| Chrome | 80+ | ✅ Yes |
| Firefox | 75+ | ✅ Yes |
| Safari | 13+ | ✅ Yes |
| Edge | 80+ | ✅ Yes |
| Opera | 67+ | ✅ Yes |

### Desktop Apps

| Platform | Architectures | Formats |
|----------|--------------|---------|
| **macOS** | Intel (x64), Apple Silicon (arm64) | DMG, ZIP |
| **Windows** | 32-bit (ia32), 64-bit (x64) | NSIS Installer, Portable EXE |
| **Linux** | 64-bit (x64) | AppImage, DEB, Snap |

**Devices:** Windows, macOS, Linux, iOS 13+, Android 8+

---

## 🖨️ Print Guidelines

### Recommended Settings

```
Paper Size:     A4 (210×297mm)
Quality:        Best/High (300 DPI)
Color Mode:     Color
Paper Type:     Photo Paper (180-200 GSM)
Finish:         Glossy or Matte
Borderless:     Off
```

---

## 💰 Cost Comparison

| Option | Cost | Privacy | Speed |
|--------|------|---------|-------|
| This Tool | Free | 100% Private | Instant |
| Photo Studios | $10-20 | Stored | 30-60 min |
| Online Services | $5-10 | Uploaded | 5-10 min |
| Mobile Apps | $2-10 | Collected | Variable |

**Annual Savings:** $100-150 vs paid alternatives

---

## 🤝 Contributing

We welcome contributions! Here's how:

```bash
# 1. Fork and clone
git clone https://github.com/your-username/passport-photo-generator.git

# 2. Create feature branch
git checkout -b feature/amazing-feature

# 3. Make changes and test

# 4. Commit changes
git commit -m "Add amazing feature"

# 5. Push to branch
git push origin feature/amazing-feature

# 6. Open Pull Request
```

### Code Standards

- Use vanilla JavaScript (no frameworks)
- Follow existing code style
- Test on Chrome, Firefox, Safari, Edge
- Maintain responsive design
- Preserve PWA functionality

---

## 🗺️ Roadmap

### Version 2.0 (Completed)

- [x] Desktop apps for Mac, Windows, and Linux
- [x] Electron-based cross-platform support
- [x] Native application experience

### Version 2.1 (Completed)

- [x] AI background removal + background color presets (white, blue, red, grey, custom)
- [x] Face detection and auto-crop (uploaded photos, in addition to Live Camera Studio)
- [x] Multi-language support (English, Spanish, French, Hindi, German, Portuguese)
- [x] Before/After comparison slider
- [x] More filters and effects (Grayscale, Sepia, Vintage, Cool, Warm, Vivid, Vignette)
- [x] Batch processing (apply the same edits to multiple photos, export as ZIP/PDF)

### Version 2.2 (Planned)

- [ ] Native mobile apps

---

## 📄 License

MIT License - Free to use, modify, and distribute.

```
Copyright (c) 2025 Rizwan Soaib

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish, and
distribute copies of the Software.
```

Full license text in [LICENSE](LICENSE) file.

---

## 👨‍💻 Developer

**Made with ❤️ in India by Rizwan Soaib**

- GitHub: [@rizwansoaib](https://github.com/rizwansoaib)
- LinkedIn: [rizwansoaib](https://linkedin.com/in/rizwansoaib)
- Twitter: [@rizwansoaib](https://twitter.com/rizwansoaib)

---

## 🙏 Acknowledgments

Special thanks to:
- [Cropper.js](https://fengyuanchen.github.io/cropperjs/) - Image cropping library
- [jsPDF](https://github.com/parallax/jsPDF) - PDF generation
- Open Source Community

---

## 📞 Support

- **Documentation:** This README
- **Issues:** [GitHub Issues](https://github.com/rizwansoaib/passport-photo-generator/issues)
- **Discussions:** [GitHub Discussions](https://github.com/rizwansoaib/passport-photo-generator/discussions)

---

## ⭐ Star History

If this tool helped you, please star it!

**Helping people create professional photos worldwide**

---

**© 2025 Rizwan Soaib • MIT License**

*Built in India 🇮🇳 • Used Worldwide 🌍 • Free Forever 💯*
