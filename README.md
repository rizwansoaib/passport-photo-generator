# 📸 Passport Photo Generator# Passport Photo Generator



<div align="center">This project is a simple web application that allows users to upload a photo, specify the number of passport-sized photos they want, and generate a PDF document containing those photos in A4 format. The application is built using HTML, CSS, and JavaScript, and does not require any backend services.



![Passport Photo Generator](https://img.shields.io/badge/Version-2.0.0-purple?style=for-the-badge)## Project Structure

![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)```

passport-photo-generator

**Create professional passport photos instantly - 100% Free, Offline & Private! 🎨**├── index.html          # Main HTML document for the user interface

├── css

[🚀 Live Demo](#) • [📖 Documentation](#features) • [🤝 Contributing](#contributing) • [⭐ Star Us](https://github.com/rizwansoaib)│   └── styles.css      # Styles for the application

├── js

</div>│   ├── app.js          # Entry point for JavaScript functionality

│   ├── photoUpload.js   # Handles photo upload functionality

---│   ├── canvasRenderer.js # Renders the uploaded photo on the canvas

│   └── pdfGenerator.js   # Generates and downloads the PDF document

## 📖 The Story Behind This Project└── README.md           # Documentation for the project

```

### 💭 The Motivation

## Features

Have you ever needed passport photos urgently, only to find yourself:

- 💸 Paying excessive fees at photo studios ($10-20 for a simple photo!)- Upload a photo from your device.

- ⏰ Wasting time traveling to and waiting at studios- Input the number of passport-sized photos to generate.

- 🔐 Worrying about your personal photos being stored on someone else's server- Render the photos on a canvas in A4 passport size format.

- 🌐 Struggling with expensive online tools that require subscriptions- Generate and download a PDF containing the rendered photos.

- 📱 Dealing with apps that collect your data

## Usage

**I faced these exact problems.** As a developer and someone who frequently needs passport photos for various applications, I was frustrated by the lack of a simple, free, and privacy-respecting solution.

1. Open `index.html` in your web browser.

### 💡 The Solution2. Use the file input to upload a photo.

3. Enter the desired number of passport photos in the input field.

That's when I decided: **Why not build it myself?**4. Click the "Generate PDF" button to create and download the PDF document.



I created this tool with one mission: **Make passport photo creation accessible to everyone, everywhere, for free.**## Dependencies



No servers. No sign-ups. No hidden costs. No data collection. Just pure, simple functionality that works entirely in your browser.This project uses the following libraries:



### 🌍 Built in India with ❤️- [jsPDF](https://github.com/parallax/jsPDF) - A library for generating PDF documents in JavaScript.



This project represents the spirit of innovation and problem-solving. It's a small contribution to make life easier for millions of people worldwide who need passport photos but don't want to deal with the hassle and expense of traditional methods.## License



---This project is open-source and available under the MIT License.

## ✨ Features

### 🎯 Core Features

- **📤 Upload & Process** - Support for JPG, PNG, and WEBP formats
- **✂️ Smart Cropping** - Professional cropping with Cropper.js or skip for original size
- **🎨 Advanced Adjustments** - 6 professional editing tools:
  - ☀️ Brightness (-100 to +100)
  - 🔲 Contrast (0-200%)
  - 🌈 Saturation (0-200%)
  - 💡 Exposure (-100 to +100)
  - ⚡ Sharpness (0-100)
  - 🌫️ Blur (0-20px)
- **✨ Auto Enhance** - One-click photo enhancement
- **📐 Multiple Sizes** - Pre-configured for different countries:
  - 🇮🇳 India/UK (35×45mm)
  - 🇺🇸 USA (51×51mm)
  - 🇨🇦 Canada (50×70mm)
  - 🇪🇺 Schengen (35×45mm)
  - 🇨🇳 China (33×48mm)
  - 🎯 Custom size (20-100mm width, 20-150mm height)
- **📄 A4 Layout** - Automatically arranges photos on A4 sheet at 300 DPI
- **🔢 Photo Count** - Choose 1 to maximum photos that fit
- **📥 Multiple Export Options**:
  - 🖨️ Direct print
  - 📄 PDF download
  - 🖼️ JPG download (single or A4 sheet)

### 🔒 Privacy & Security

- **100% Offline** - Works entirely in your browser after initial load
- **Zero Server Upload** - Your photos never leave your device
- **No Data Collection** - No tracking, no analytics, no cookies
- **No Sign-up Required** - Instant access without registration
- **Open Source** - Transparent code you can audit
- **Privacy First** - Your data belongs to you, always

### 🚀 Technical Features

- **⚡ Instant Processing** - Real-time preview and adjustments
- **🌓 Dark Mode** - Eye-friendly dark theme with toggle
- **📱 Responsive Design** - Works perfectly on mobile, tablet, and desktop
- **🔄 Progressive Web App** - Install on any device like a native app
- **💾 Service Worker** - Works offline after first visit
- **🎯 High Quality** - 300 DPI output for professional results
- **🎨 Modern UI** - Beautiful gradient-based design with smooth animations

---

## 🎭 Two Modes for Every Need

### 🏃 Simple Mode (index.html)
Perfect for quick passport photo generation:
1. Upload your photo
2. Select photo size (country preset or custom)
3. Generate PDF or Print immediately

**Best for:** Speed and simplicity when you just need basic passport photos.

### 🎨 Advanced Editor (editor.html)
Professional photo editing with full control:
1. Upload your photo
2. Crop with precision tools (or skip)
3. Apply 6 professional adjustments
4. Use Auto Enhance for instant improvements
5. Select photo size and quantity
6. Generate A4 layout with live preview

**Best for:** Professional results with fine-tuned control over every aspect.

---

## 🚀 Getting Started

### 📦 Installation

**Option 1: Clone Repository**
```bash
# Clone the repository
git clone https://github.com/rizwansoaib/passport-photo-generator.git

# Navigate to project directory
cd passport-photo-generator

# Open in browser (no build required!)
open index.html
```

**Option 2: Download ZIP**
1. Download the ZIP file from GitHub
2. Extract to your desired location
3. Open `index.html` in any modern browser

**Option 3: Use as PWA**
1. Visit the live demo
2. Click "Install" in your browser
3. Use offline anytime!

### 🎯 Quick Start Guide

#### Simple Mode:
1. **Upload** - Click "Upload Photo" and select your image
2. **Size** - Choose country preset or enter custom dimensions
3. **Generate** - Click "Print Photos" or "Generate PDF"
4. **Done!** - Your passport photos are ready! ✨

#### Advanced Editor:
1. **Upload** - Drag & drop or click to upload your photo
2. **Crop** - Use crop tools to frame perfectly (or skip)
3. **Adjust** - Fine-tune brightness, contrast, saturation, etc.
4. **Enhance** - Try "Auto Enhance" for instant improvements
5. **Size & Count** - Select photo size and how many you need
6. **Generate** - Create A4 layout and print/download
7. **Perfect!** - Professional passport photos ready! 🎉

---

## 🏗️ Project Structure

```
passport-photo-generator/
│
├── 📄 index.html              # Simple mode entry point
├── 📄 editor.html             # Advanced editor entry point
│
├── 🎨 css/
│   └── styles.css            # Unified styles for all pages (1200+ lines)
│
├── ⚙️ js/
│   ├── app.js                # Simple mode logic (340+ lines)
│   └── editor.js             # Advanced editor logic (600+ lines)
│
├── 📱 manifest.json          # PWA configuration
├── 🔧 service-worker.js      # Offline support
│
└── 📖 README.md              # This beautiful documentation
```

---

## 🛠️ Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS Variables
- **Vanilla JavaScript** - No framework bloat, pure performance

### Libraries
- **[Cropper.js](https://fengyuanchen.github.io/cropperjs/)** (v1.6.1) - Professional image cropping
- **[jsPDF](https://github.com/parallax/jsPDF)** (v2.5.1) - PDF generation

### APIs
- **Canvas API** - High-quality image processing at 300 DPI
- **File API** - Local file handling
- **Service Worker API** - Offline functionality

### Features
- **Progressive Web App** - Installable on any device
- **Responsive Design** - Mobile-first approach
- **Dark Mode** - CSS variables with localStorage persistence
- **Zero Dependencies** - Self-contained, no npm required

---

## 🎨 Design Philosophy

### Color Palette
- **Primary Gradient**: Purple to Indigo (#667eea → #764ba2)
- **Success**: Green (#28a745 → #20c997)
- **Info**: Blue (#17a2b8 → #138496)
- **Warning**: Orange (#ff9800 → #ff5722)

### Principles
1. **Simplicity First** - Easy to use, hard to mess up
2. **Privacy Always** - Your data stays with you
3. **Performance Matters** - Fast loading, instant processing
4. **Accessibility** - Keyboard navigation, screen reader friendly
5. **Beauty Counts** - Professional look with smooth animations

---

## 📐 Supported Photo Sizes

| Country/Region | Dimensions | Aspect Ratio |
|---------------|------------|--------------|
| 🇮🇳 India     | 35×45mm    | 7:9          |
| 🇬🇧 UK        | 35×45mm    | 7:9          |
| 🇺🇸 USA       | 51×51mm    | 1:1          |
| 🇨🇦 Canada    | 50×70mm    | 5:7          |
| 🇪🇺 Schengen  | 35×45mm    | 7:9          |
| 🇨🇳 China     | 33×48mm    | 11:16        |
| 🎯 Custom     | 20-100mm × 20-150mm | Variable |

---

## 🖨️ Print Guidelines

### Best Practices
1. **Use Photo Paper** - Glossy or matte photo paper (not regular paper)
2. **Check Printer Settings**:
   - Paper Size: A4
   - Quality: High/Best
   - Color Mode: Color
   - Borderless: Off (use margins)
3. **Preview First** - Always check print preview
4. **Cut Carefully** - Use a ruler and sharp scissors or paper cutter

### Professional Tips
- 🎯 Print on 180-200 GSM photo paper for best results
- ✂️ Use a paper cutter for perfectly straight edges
- 📏 Measure twice, cut once
- 🖨️ Calibrate your printer for accurate colors

---

## 🤝 Contributing

We love contributions! Here's how you can help:

### Ways to Contribute
- 🐛 **Report Bugs** - Found an issue? Let us know!
- 💡 **Suggest Features** - Have an idea? We'd love to hear it!
- 📝 **Improve Documentation** - Help others understand better
- 🌍 **Translate** - Make it accessible in your language
- 💻 **Submit Code** - Fork, code, and create a pull request

### Development Setup
```bash
# Fork and clone the repository
git clone https://github.com/your-username/passport-photo-generator.git

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes
# Test thoroughly in multiple browsers

# Commit your changes
git commit -m "✨ Add amazing feature"

# Push to your fork
git push origin feature/amazing-feature

# Create a Pull Request
```

### Code Standards
- ✅ Use vanilla JavaScript (no frameworks)
- ✅ Comment complex logic
- ✅ Follow existing code style
- ✅ Test in Chrome, Firefox, Safari, and Edge
- ✅ Ensure mobile responsiveness
- ✅ Maintain offline functionality

---

## 🐛 Known Issues & Roadmap

### Known Issues
- 📱 Some older mobile browsers may have limited Canvas API support
- 🖨️ Print margins may vary by printer model
- 🌐 Requires modern browser (Chrome 80+, Firefox 75+, Safari 13+)

### Roadmap v2.1
- [ ] 🎭 Background removal (AI-powered)
- [ ] 👤 Face detection for auto-crop
- [ ] 🌍 Multi-language support (Hindi, Spanish, French, etc.)
- [ ] 📊 Before/After comparison slider
- [ ] 🎨 More preset filters
- [ ] 📱 Native mobile apps (iOS & Android)
- [ ] 🔄 Batch processing for multiple photos
- [ ] 💾 Local storage for settings

---

## 📱 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| 🟢 Chrome | 80+ | ✅ Fully Supported |
| 🟢 Firefox | 75+ | ✅ Fully Supported |
| 🟢 Safari | 13+ | ✅ Fully Supported |
| 🟢 Edge | 80+ | ✅ Fully Supported |
| 🟡 Opera | 67+ | ✅ Supported |
| 🔴 IE 11 | - | ❌ Not Supported |

---

## 📄 License

This project is licensed under the **MIT License** - see below for details:

```
MIT License

Copyright (c) 2025 Rizwan Soaib

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**TL;DR:** You can use, modify, and distribute this project freely! 🎉

---

## 👨‍💻 Developer

<div align="center">

### Made with ❤️ in India by Rizwan Soaib

[![GitHub](https://img.shields.io/badge/GitHub-rizwansoaib-181717?style=for-the-badge&logo=github)](https://github.com/rizwansoaib)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/rizwansoaib)
[![Twitter](https://img.shields.io/badge/Twitter-Follow-1DA1F2?style=for-the-badge&logo=twitter)](https://twitter.com/rizwansoaib)

</div>

### About the Developer

I'm a passionate developer who believes in building tools that solve real problems for real people. This project represents my commitment to:
- 🔓 **Open Source** - Sharing knowledge and solutions
- 🔐 **Privacy** - Respecting user data and rights
- 🆓 **Free Software** - Making technology accessible to everyone
- 🌍 **Global Impact** - Building for users worldwide

---

## 🙏 Acknowledgments

Special thanks to:
- **[Cropper.js](https://fengyuanchen.github.io/cropperjs/)** - For the amazing cropping library
- **[jsPDF](https://github.com/parallax/jsPDF)** - For making PDF generation simple
- **Open Source Community** - For inspiration and support
- **You** - For using and supporting this project! ⭐

---

## 💬 Support & Community

### Get Help
- 📖 **Documentation** - Read this README thoroughly
- 🐛 **Issues** - Report bugs on GitHub Issues
- 💡 **Discussions** - Join GitHub Discussions for questions
- 📧 **Email** - Contact developer for private inquiries

### Stay Updated
- ⭐ **Star this repo** to get updates
- 👀 **Watch** for new releases
- 🍴 **Fork** to customize for your needs
- 🔔 **Subscribe** to release notifications

---

## 📊 Project Stats

<div align="center">

![GitHub Stars](https://img.shields.io/github/stars/rizwansoaib/passport-photo-generator?style=social)
![GitHub Forks](https://img.shields.io/github/forks/rizwansoaib/passport-photo-generator?style=social)
![GitHub Watchers](https://img.shields.io/github/watchers/rizwansoaib/passport-photo-generator?style=social)

![Code Size](https://img.shields.io/github/languages/code-size/rizwansoaib/passport-photo-generator)
![Last Commit](https://img.shields.io/github/last-commit/rizwansoaib/passport-photo-generator)
![Issues](https://img.shields.io/github/issues/rizwansoaib/passport-photo-generator)

</div>

---

## 🎯 Why Choose This Tool?

| Feature | This Tool | Photo Studios | Online Tools |
|---------|-----------|---------------|--------------|
| **Cost** | 🟢 Free Forever | 🔴 $10-20 per session | 🟡 $5-10 or subscription |
| **Privacy** | 🟢 100% Offline | 🔴 Photos stored | 🔴 Data collected |
| **Speed** | 🟢 Instant | 🔴 Travel + Wait time | 🟡 Upload + Process |
| **Convenience** | 🟢 Use anywhere | 🔴 Visit location | 🟡 Requires internet |
| **Quality** | 🟢 300 DPI | 🟢 Professional | 🟡 Varies |
| **Customization** | 🟢 Full control | 🔴 Limited | 🟡 Some options |
| **Sign-up** | 🟢 None required | 🔴 Not needed | 🔴 Usually required |
| **Offline** | 🟢 Works offline | 🔴 Must visit | 🔴 Requires internet |

---

## 🌟 Star History

If this project helped you, please consider giving it a star! ⭐

Every star motivates me to keep improving and adding new features.

<div align="center">

### 🎉 Thank you for using Passport Photo Generator! 🎉

**Made with ❤️ by developers, for everyone**

[⬆ Back to Top](#-passport-photo-generator)

</div>

---

<div align="center">

**© 2025 Rizwan Soaib. Licensed under MIT.**

*Built in India 🇮🇳 • Used Worldwide 🌍*

</div>
