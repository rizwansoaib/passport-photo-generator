(function() {
    'use strict';

    // Loading Animation
    const appLoader = document.getElementById('appLoader');
    window.addEventListener('load', () => {
        setTimeout(() => {
            appLoader.classList.add('hidden');
        }, 1000);
    });

    // PWA Install Prompt
    let deferredPrompt;
    const installPrompt = document.getElementById('installPrompt');
    const installButton = document.getElementById('installButton');
    const installLater = document.getElementById('installLater');
    const installClose = document.getElementById('installClose');

    // Capture the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Don't show if already dismissed
        if (!localStorage.getItem('installPromptDismissed')) {
            setTimeout(() => {
                installPrompt.classList.add('show');
            }, 3000); // Show after 3 seconds
        }
    });

    // Install button click
    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Install prompt outcome: ${outcome}`);
        
        deferredPrompt = null;
        installPrompt.classList.remove('show');
    });

    // Later button click
    installLater.addEventListener('click', () => {
        installPrompt.classList.remove('show');
        localStorage.setItem('installPromptDismissed', 'true');
        // Clear after 7 days
        setTimeout(() => {
            localStorage.removeItem('installPromptDismissed');
        }, 7 * 24 * 60 * 60 * 1000);
    });

    // Close button click
    installClose.addEventListener('click', () => {
        installPrompt.classList.remove('show');
        localStorage.setItem('installPromptDismissed', 'true');
    });

    // Constants
    const A4_WIDTH = 2480;
    const A4_HEIGHT = 3508;
    const DPI = 300;
    const MM_TO_INCH = 25.4;

    // State
    let originalImage = null;
    let cropper = null;
    let croppedCanvas = null;
    let PHOTO_WIDTH = 413;
    let PHOTO_HEIGHT = 531;
    let adjustments = {
        brightness: 0,
        contrast: 100,
        saturation: 100,
        exposure: 0,
        sharpness: 0,
        blur: 0
    };
    let backgroundColor = '#ffffff';

    // DOM Elements
    const photoUpload = document.getElementById('photoUpload');
    
    const uploadZone = document.getElementById('uploadZone');
    const cropArea = document.getElementById('cropArea');
    const cropImage = document.getElementById('cropImage');
    const previewArea = document.getElementById('previewArea');
    const previewCanvas = document.getElementById('previewCanvas');
    const a4Area = document.getElementById('a4Area');
    const a4Canvas = document.getElementById('a4Canvas');
    
    const cropToolsCard = document.getElementById('cropToolsCard');
    const adjustmentsCard = document.getElementById('adjustmentsCard');
    const sizeSelectionCard = document.getElementById('sizeSelectionCard');
    
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.querySelector('.theme-icon');

    // Dark Mode
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeIcon.textContent = '☀️';
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        themeIcon.textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    // Helper Functions
    function mmToPixels(mm) {
        return Math.round((mm / MM_TO_INCH) * DPI);
    }

    function showSection(section) {
        uploadZone.style.display = 'none';
        cropArea.style.display = 'none';
        previewArea.style.display = 'none';
        a4Area.style.display = 'none';
        
        section.style.display = 'block';
    }

    function showCard(card) {
        card.style.display = 'block';
    }

    function hideCard(card) {
        card.style.display = 'none';
    }

    // Photo Upload
    photoUpload.addEventListener('change', handleFileUpload);
    
    uploadZone.addEventListener('click', () => {
        photoUpload.click();
    });

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--accent-color)';
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = 'var(--border-color)';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--border-color)';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            loadImage(file);
        }
    });

    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (file) {
            loadImage(file);
        }
    }

    // Live Camera Studio launcher
    const openCameraBtn = document.getElementById('openCameraBtn');
    if (openCameraBtn) {
        openCameraBtn.addEventListener('click', () => {
            if (!window.PPGCameraStudio) {
                alert('Live Camera Studio failed to load. Please check your connection and reload the page.');
                return;
            }
            window.PPGCameraStudio.open({
                preset: {
                    widthMM: (PHOTO_WIDTH / DPI) * MM_TO_INCH,
                    heightMM: (PHOTO_HEIGHT / DPI) * MM_TO_INCH
                },
                onCapture: (file, autoCropRect) => {
                    loadImage(file, autoCropRect);
                }
            });
        });
    }

    function loadImage(file, autoCropRect) {
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage = new Image();
            originalImage.onload = () => {
                initCropper(autoCropRect);
            };
            originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Expose a hook so the Live Camera Studio (js/cameraStudio.js) can hand
    // off a captured photo (and an optional AI-computed auto-crop rectangle,
    // in natural image pixel coordinates) into the existing crop/edit flow.
    window.PPG_loadCapturedPhoto = loadImage;

    // Cropper Initialization
    function initCropper(autoCropRect) {
        showSection(cropArea);
        showCard(cropToolsCard);
        
        cropImage.src = originalImage.src;
        
        if (cropper) {
            cropper.destroy();
        }
        
        const aspectRatio = PHOTO_WIDTH / PHOTO_HEIGHT;
        
        cropper = new Cropper(cropImage, {
            aspectRatio: aspectRatio,
            viewMode: 1,
            autoCropArea: 1,
            responsive: true,
            restore: false,
            guides: true,
            center: true,
            highlight: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            ready: function () {
                // Smart Auto-Crop: if the camera studio detected a face and
                // computed an optimal crop box, apply it automatically.
                if (autoCropRect && autoCropRect.width > 0 && autoCropRect.height > 0) {
                    cropper.setData(autoCropRect);
                }
            }
        });
    }

    // Crop Tools
    document.getElementById('rotateLeft').addEventListener('click', () => {
        cropper.rotate(-90);
    });

    document.getElementById('rotateRight').addEventListener('click', () => {
        cropper.rotate(90);
    });

    document.getElementById('flipH').addEventListener('click', () => {
        const scaleX = cropper.getData().scaleX || 1;
        cropper.scaleX(-scaleX);
    });

    document.getElementById('flipV').addEventListener('click', () => {
        const scaleY = cropper.getData().scaleY || 1;
        cropper.scaleY(-scaleY);
    });

    document.getElementById('resetCrop').addEventListener('click', () => {
        cropper.reset();
    });

    document.getElementById('applyCrop').addEventListener('click', () => {
        // Reset to standard passport photo dimensions
        PHOTO_WIDTH = 413;
        PHOTO_HEIGHT = 531;
        
        croppedCanvas = cropper.getCroppedCanvas({
            width: PHOTO_WIDTH,
            height: PHOTO_HEIGHT,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });
        
        showSection(previewArea);
        hideCard(cropToolsCard);
        showCard(adjustmentsCard);
        
        renderPreview();
    });

    document.getElementById('noCrop').addEventListener('click', () => {
        // Use the original image as-is, no cropping or resizing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalImage.width;
        tempCanvas.height = originalImage.height;
        
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(originalImage, 0, 0);
        
        croppedCanvas = tempCanvas;
        
        // Update PHOTO_WIDTH and PHOTO_HEIGHT to match original image dimensions
        PHOTO_WIDTH = originalImage.width;
        PHOTO_HEIGHT = originalImage.height;
        
        showSection(previewArea);
        hideCard(cropToolsCard);
        showCard(adjustmentsCard);
        
        renderPreview();
    });

    document.getElementById('backToCrop').addEventListener('click', () => {
        showSection(cropArea);
        showCard(cropToolsCard);
        hideCard(adjustmentsCard);
    });

    // Adjustments
    const brightnessSlider = document.getElementById('brightness');
    const contrastSlider = document.getElementById('contrast');
    const saturationSlider = document.getElementById('saturation');
    const exposureSlider = document.getElementById('exposure');
    const sharpnessSlider = document.getElementById('sharpness');
    const blurSlider = document.getElementById('blur');

    brightnessSlider.addEventListener('input', (e) => {
        adjustments.brightness = parseInt(e.target.value);
        document.getElementById('brightnessValue').textContent = e.target.value;
        if (croppedCanvas) renderPreview();
    });

    contrastSlider.addEventListener('input', (e) => {
        adjustments.contrast = parseInt(e.target.value);
        document.getElementById('contrastValue').textContent = e.target.value;
        if (croppedCanvas) renderPreview();
    });

    saturationSlider.addEventListener('input', (e) => {
        adjustments.saturation = parseInt(e.target.value);
        document.getElementById('saturationValue').textContent = e.target.value;
        if (croppedCanvas) renderPreview();
    });

    exposureSlider.addEventListener('input', (e) => {
        adjustments.exposure = parseInt(e.target.value);
        document.getElementById('exposureValue').textContent = e.target.value;
        if (croppedCanvas) renderPreview();
    });

    sharpnessSlider.addEventListener('input', (e) => {
        adjustments.sharpness = parseInt(e.target.value);
        document.getElementById('sharpnessValue').textContent = e.target.value;
        if (croppedCanvas) renderPreview();
    });

    blurSlider.addEventListener('input', (e) => {
        adjustments.blur = parseInt(e.target.value);
        document.getElementById('blurValue').textContent = e.target.value;
        if (croppedCanvas) renderPreview();
    });

    document.getElementById('autoEnhance').addEventListener('click', () => {
        adjustments = {
            brightness: 10,
            contrast: 110,
            saturation: 105,
            exposure: 5,
            sharpness: 15,
            blur: 0
        };
        
        brightnessSlider.value = 10;
        contrastSlider.value = 110;
        saturationSlider.value = 105;
        exposureSlider.value = 5;
        sharpnessSlider.value = 15;
        blurSlider.value = 0;
        
        document.getElementById('brightnessValue').textContent = 10;
        document.getElementById('contrastValue').textContent = 110;
        document.getElementById('saturationValue').textContent = 105;
        document.getElementById('exposureValue').textContent = 5;
        document.getElementById('sharpnessValue').textContent = 15;
        document.getElementById('blurValue').textContent = 0;
        
        renderPreview();
    });

    document.getElementById('resetAdjustments').addEventListener('click', () => {
        adjustments = {
            brightness: 0,
            contrast: 100,
            saturation: 100,
            exposure: 0,
            sharpness: 0,
            blur: 0
        };
        
        brightnessSlider.value = 0;
        contrastSlider.value = 100;
        saturationSlider.value = 100;
        exposureSlider.value = 0;
        sharpnessSlider.value = 0;
        blurSlider.value = 0;
        
        document.getElementById('brightnessValue').textContent = 0;
        document.getElementById('contrastValue').textContent = 100;
        document.getElementById('saturationValue').textContent = 100;
        document.getElementById('exposureValue').textContent = 0;
        document.getElementById('sharpnessValue').textContent = 0;
        document.getElementById('blurValue').textContent = 0;
        
        if (croppedCanvas) renderPreview();
    });

    // Render Preview
    function renderPreview() {
        if (!croppedCanvas) return;
        
        previewCanvas.width = PHOTO_WIDTH;
        previewCanvas.height = PHOTO_HEIGHT;
        
        const ctx = previewCanvas.getContext('2d');
        
        // Apply background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
        
        // Apply filters
        ctx.filter = `
            brightness(${100 + adjustments.brightness}%)
            contrast(${adjustments.contrast}%)
            saturate(${adjustments.saturation}%)
            blur(${adjustments.blur}px)
        `;
        
        // Draw image
        ctx.drawImage(croppedCanvas, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
        
        // Reset filter
        ctx.filter = 'none';
        
        // Apply exposure (additional brightness layer)
        if (adjustments.exposure !== 0) {
            ctx.globalAlpha = Math.abs(adjustments.exposure) / 200;
            ctx.fillStyle = adjustments.exposure > 0 ? 'white' : 'black';
            ctx.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
            ctx.globalAlpha = 1;
        }
    }

    // Generate A4
    document.getElementById('generateA4').addEventListener('click', () => {
        showSection(a4Area);
        hideCard(adjustmentsCard);
        showCard(sizeSelectionCard);
        
        // Initialize photo count slider
        const maxPhotos = calculateMaxPhotos();
        photoCountSlider.max = maxPhotos;
        photoCountSlider.value = maxPhotos;
        photoCountValue.textContent = 'Maximum';
        
        generateA4Layout();
    });

    // Download Single Image
    document.getElementById('downloadSingle').addEventListener('click', () => {
        previewCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'passport-photo.jpg';
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/jpeg', 1.0);
    });

    function generateA4Layout() {
        a4Canvas.width = A4_WIDTH;
        a4Canvas.height = A4_HEIGHT;
        
        const ctx = a4Canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);
        
        const margin = 60;
        const spacing = 30;
        
        const availableWidth = A4_WIDTH - (2 * margin);
        const availableHeight = A4_HEIGHT - (2 * margin);
        
        const photosPerRow = Math.floor((availableWidth + spacing) / (PHOTO_WIDTH + spacing));
        const photosPerCol = Math.floor((availableHeight + spacing) / (PHOTO_HEIGHT + spacing));
        
        const maxPhotos = photosPerRow * photosPerCol;
        const sliderValue = parseInt(photoCountSlider?.value || maxPhotos);
        const photosToRender = sliderValue >= maxPhotos ? maxPhotos : Math.max(1, sliderValue);
        
        let count = 0;
        
        for (let row = 0; row < photosPerCol && count < photosToRender; row++) {
            for (let col = 0; col < photosPerRow && count < photosToRender; col++) {
                const x = margin + col * (PHOTO_WIDTH + spacing);
                const y = margin + row * (PHOTO_HEIGHT + spacing);
                
                ctx.drawImage(previewCanvas, x, y, PHOTO_WIDTH, PHOTO_HEIGHT);
                count++;
            }
        }
    }

    // Photo Size Selection
    const photoSizeRadios = document.querySelectorAll('input[name="photoSize"]');
    const customSizeInputs = document.getElementById('customSizeInputs');
    const customWidth = document.getElementById('customWidth');
    const customHeight = document.getElementById('customHeight');

    photoSizeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const value = e.target.value;
            
            if (value === 'custom') {
                customSizeInputs.style.display = 'block';
                updatePhotoSizeFromCustom();
            } else {
                customSizeInputs.style.display = 'none';
                updatePhotoSizeFromPreset(value);
            }
            
            // Live preview - update A4 layout immediately
            updateA4WithNewSize();
            updatePhotoCountSlider();
        });
    });

    customWidth.addEventListener('input', () => {
        updatePhotoSizeFromCustom();
        updateA4WithNewSize();
        updatePhotoCountSlider();
    });
    
    customHeight.addEventListener('input', () => {
        updatePhotoSizeFromCustom();
        updateA4WithNewSize();
        updatePhotoCountSlider();
    });

    // Photo Count Slider
    const photoCountSlider = document.getElementById('photoCountSlider');
    const photoCountValue = document.getElementById('photoCountValue');
    let isAtMaximum = true; // Track if user wants maximum photos

    photoCountSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        const maxPhotos = calculateMaxPhotos();
        
        // Ensure value is at least 1
        if (value < 1) {
            photoCountSlider.value = 1;
            photoCountValue.textContent = '1';
            isAtMaximum = false;
        } else if (value >= maxPhotos) {
            photoCountValue.textContent = 'Maximum';
            isAtMaximum = true;
        } else {
            photoCountValue.textContent = value;
            isAtMaximum = false;
        }
        
        generateA4Layout();
    });

    function calculateMaxPhotos() {
        const margin = 60;
        const spacing = 30;
        const availableWidth = A4_WIDTH - (2 * margin);
        const availableHeight = A4_HEIGHT - (2 * margin);
        const photosPerRow = Math.floor((availableWidth + spacing) / (PHOTO_WIDTH + spacing));
        const photosPerCol = Math.floor((availableHeight + spacing) / (PHOTO_HEIGHT + spacing));
        return photosPerRow * photosPerCol;
    }

    function updatePhotoCountSlider() {
        const maxPhotos = calculateMaxPhotos();
        photoCountSlider.max = maxPhotos;
        
        // If user wants maximum or current value exceeds new max, set to new maximum
        if (isAtMaximum || parseInt(photoCountSlider.value) > maxPhotos) {
            photoCountSlider.value = maxPhotos;
            photoCountValue.textContent = 'Maximum';
            isAtMaximum = true;
        }
    }

    function updatePhotoSizeFromPreset(preset) {
        const sizes = {
            'india': { width: 35, height: 45 },
            'usa': { width: 51, height: 51 },
            'canada': { width: 50, height: 70 },
            'schengen': { width: 35, height: 45 },
            'china': { width: 33, height: 48 }
        };
        
        const size = sizes[preset];
        if (size) {
            PHOTO_WIDTH = mmToPixels(size.width);
            PHOTO_HEIGHT = mmToPixels(size.height);
        }
    }

    function updatePhotoSizeFromCustom() {
        const width = parseInt(customWidth.value) || 35;
        const height = parseInt(customHeight.value) || 45;
        PHOTO_WIDTH = mmToPixels(width);
        PHOTO_HEIGHT = mmToPixels(height);
    }

    function updateA4WithNewSize() {
        // Resize the preview canvas to new dimensions
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = PHOTO_WIDTH;
        tempCanvas.height = PHOTO_HEIGHT;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Apply background
        tempCtx.fillStyle = backgroundColor;
        tempCtx.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
        
        // Apply filters and draw resized image
        tempCtx.filter = `
            brightness(${100 + adjustments.brightness}%)
            contrast(${adjustments.contrast}%)
            saturate(${adjustments.saturation}%)
            blur(${adjustments.blur}px)
        `;
        
        tempCtx.drawImage(croppedCanvas, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
        tempCtx.filter = 'none';
        
        // Apply exposure
        if (adjustments.exposure !== 0) {
            tempCtx.globalAlpha = Math.abs(adjustments.exposure) / 200;
            tempCtx.fillStyle = adjustments.exposure > 0 ? 'white' : 'black';
            tempCtx.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
            tempCtx.globalAlpha = 1;
        }
        
        // Update preview canvas
        previewCanvas.width = PHOTO_WIDTH;
        previewCanvas.height = PHOTO_HEIGHT;
        const ctx = previewCanvas.getContext('2d');
        ctx.drawImage(tempCanvas, 0, 0);
        
        // Regenerate A4 layout
        generateA4Layout();
        
        // Update photo count slider
        updatePhotoCountSlider();
    }

    // Print
    document.getElementById('printA4').addEventListener('click', () => {
        // Clear page title temporarily for cleaner print
        const originalTitle = document.title;
        document.title = '';
        
        window.print();
        
        // Restore title after print dialog
        setTimeout(() => {
            document.title = originalTitle;
        }, 100);
    });

    // Download PDF
    document.getElementById('downloadPDF').addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const imgData = a4Canvas.toDataURL('image/jpeg', 1.0);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        pdf.save('passport-photos.pdf');
    });

    // Download JPG
    document.getElementById('downloadJPG').addEventListener('click', () => {
        a4Canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'passport-photos.jpg';
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/jpeg', 1.0);
    });

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('✅ Service Worker registered successfully:', registration.scope);
                })
                .catch(error => {
                    console.log('❌ Service Worker registration failed:', error);
                });
        });
    }

})();
