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
    let bgRemovalEnabled = false;
    let bgRemovedCanvas = null;
    let filterPreset = 'none';
    let vignetteEnabled = false;

    const FILTER_PRESETS = {
        none: '',
        grayscale: 'grayscale(100%)',
        sepia: 'sepia(80%)',
        vintage: 'sepia(40%) contrast(90%) brightness(105%) saturate(85%)',
        cool: 'saturate(90%) hue-rotate(15deg) brightness(102%)',
        warm: 'saturate(110%) hue-rotate(-10deg) brightness(103%)',
        vivid: 'saturate(140%) contrast(110%)'
    };

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
    const backgroundCard = document.getElementById('backgroundCard');
    const batchCard = document.getElementById('batchCard');
    
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

                // If no auto-crop rect was already supplied (e.g. from the
                // Live Camera Studio), try to compute one from an uploaded
                // photo using on-device AI face detection. Non-blocking: the
                // cropper is already visible and usable while this resolves.
                if (!autoCropRect && window.PPGFaceDetect) {
                    const aspectRatio = PHOTO_WIDTH / PHOTO_HEIGHT;
                    window.PPGFaceDetect.detectAutoCropRect(originalImage, aspectRatio)
                        .then((rect) => {
                            if (rect && cropper) {
                                cropper.setData(rect);
                            }
                        })
                        .catch(() => { /* ignore: fall back to manual crop */ });
                }
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
        
        resetBackgroundRemoval();
        showSection(previewArea);
        hideCard(cropToolsCard);
        showCard(adjustmentsCard);
        showCard(backgroundCard);
        showCard(batchCard);
        
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
        
        resetBackgroundRemoval();
        showSection(previewArea);
        hideCard(cropToolsCard);
        showCard(adjustmentsCard);
        showCard(backgroundCard);
        showCard(batchCard);
        
        renderPreview();
    });

    document.getElementById('backToCrop').addEventListener('click', () => {
        showSection(cropArea);
        showCard(cropToolsCard);
        hideCard(adjustmentsCard);
        hideCard(backgroundCard);
        hideCard(batchCard);
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

    // ------------------------------------------------------------------
    // Background: AI removal + color swatches
    // ------------------------------------------------------------------
    const removeBgToggle = document.getElementById('removeBgToggle');
    const bgRemovalStatus = document.getElementById('bgRemovalStatus');
    const customBgColorInput = document.getElementById('customBgColor');

    function resetBackgroundRemoval() {
        bgRemovedCanvas = null;
        bgRemovalEnabled = false;
        if (removeBgToggle) removeBgToggle.checked = false;
        if (bgRemovalStatus) bgRemovalStatus.style.display = 'none';
    }

    async function applyBackgroundRemoval() {
        if (!croppedCanvas || !window.PPGBackgroundRemoval) {
            bgRemovalStatus.textContent = '⚠️ Background removal is not available (offline or blocked resource).';
            bgRemovalStatus.style.display = 'block';
            removeBgToggle.checked = false;
            bgRemovalEnabled = false;
            return;
        }

        bgRemovalStatus.textContent = '⏳ Removing background with AI…';
        bgRemovalStatus.style.display = 'block';

        const result = await window.PPGBackgroundRemoval.removeBackground(croppedCanvas);

        if (!result) {
            bgRemovalStatus.textContent = '⚠️ Background removal failed (offline or model unavailable). Showing original photo.';
            removeBgToggle.checked = false;
            bgRemovalEnabled = false;
            return;
        }

        bgRemovedCanvas = result;
        bgRemovalStatus.textContent = '✅ Background removed — pick a color below.';
        renderPreview();
        if (a4Area.style.display !== 'none') updateA4WithNewSize();
    }

    if (removeBgToggle) {
        removeBgToggle.addEventListener('change', () => {
            bgRemovalEnabled = removeBgToggle.checked;
            if (bgRemovalEnabled) {
                applyBackgroundRemoval();
            } else {
                bgRemovalStatus.style.display = 'none';
                renderPreview();
                if (a4Area.style.display !== 'none') updateA4WithNewSize();
            }
        });
    }

    document.querySelectorAll('.bg-swatch').forEach((btn) => {
        btn.addEventListener('click', () => {
            backgroundColor = btn.dataset.color;
            if (customBgColorInput) customBgColorInput.value = backgroundColor;
            document.querySelectorAll('.bg-swatch').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            if (croppedCanvas) {
                renderPreview();
                if (a4Area.style.display !== 'none') updateA4WithNewSize();
            }
        });
    });

    if (customBgColorInput) {
        customBgColorInput.addEventListener('input', (e) => {
            backgroundColor = e.target.value;
            document.querySelectorAll('.bg-swatch').forEach((b) => b.classList.remove('active'));
            if (croppedCanvas) {
                renderPreview();
                if (a4Area.style.display !== 'none') updateA4WithNewSize();
            }
        });
    }

    // Returns the canvas that should be drawn as the photo's subject: the
    // AI background-removed (transparent) canvas when enabled, or the
    // plain cropped canvas otherwise.
    function getSourceCanvas() {
        return (bgRemovalEnabled && bgRemovedCanvas) ? bgRemovedCanvas : croppedCanvas;
    }

    // ------------------------------------------------------------------
    // Filters & effects
    // ------------------------------------------------------------------
    document.querySelectorAll('.filter-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            filterPreset = btn.dataset.filter;
            document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            if (croppedCanvas) {
                renderPreview();
                if (a4Area.style.display !== 'none') updateA4WithNewSize();
            }
        });
    });

    const vignetteToggle = document.getElementById('vignetteToggle');
    if (vignetteToggle) {
        vignetteToggle.addEventListener('change', () => {
            vignetteEnabled = vignetteToggle.checked;
            if (croppedCanvas) {
                renderPreview();
                if (a4Area.style.display !== 'none') updateA4WithNewSize();
            }
        });
    }

    function buildFilterString() {
        return `
            ${FILTER_PRESETS[filterPreset] || ''}
            brightness(${100 + adjustments.brightness}%)
            contrast(${adjustments.contrast}%)
            saturate(${adjustments.saturation}%)
            blur(${adjustments.blur}px)
        `;
    }

    function drawVignette(ctx, width, height) {
        if (!vignetteEnabled) return;
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, height * 0.3,
            width / 2, height / 2, height * 0.75
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

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
        ctx.filter = buildFilterString();
        
        // Draw image
        ctx.drawImage(getSourceCanvas(), 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
        
        // Reset filter
        ctx.filter = 'none';
        
        // Apply exposure (additional brightness layer)
        if (adjustments.exposure !== 0) {
            ctx.globalAlpha = Math.abs(adjustments.exposure) / 200;
            ctx.fillStyle = adjustments.exposure > 0 ? 'white' : 'black';
            ctx.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
            ctx.globalAlpha = 1;
        }

        drawVignette(ctx, PHOTO_WIDTH, PHOTO_HEIGHT);

        refreshCompareIfVisible();
    }

    // ------------------------------------------------------------------
    // Before / After comparison slider
    // ------------------------------------------------------------------
    const toggleCompareBtn = document.getElementById('toggleCompare');
    const compareContainer = document.getElementById('compareContainer');
    const compareBefore = document.getElementById('compareBefore');
    const compareAfter = document.getElementById('compareAfter');
    const compareBeforeWrap = document.getElementById('compareBeforeWrap');
    const compareRange = document.getElementById('compareRange');

    function updateCompareSliderPosition() {
        if (compareRange && compareBeforeWrap) {
            compareBeforeWrap.style.width = compareRange.value + '%';
        }
    }

    function refreshCompareIfVisible() {
        if (compareContainer && compareContainer.style.display !== 'none' && croppedCanvas) {
            compareAfter.src = previewCanvas.toDataURL('image/jpeg', 0.92);
            compareBefore.src = croppedCanvas.toDataURL('image/jpeg', 0.92);
        }
    }

    if (toggleCompareBtn) {
        toggleCompareBtn.addEventListener('click', () => {
            if (!croppedCanvas) return;
            const isShowing = compareContainer.style.display !== 'none';
            if (isShowing) {
                compareContainer.style.display = 'none';
                previewCanvas.style.display = '';
            } else {
                compareBefore.src = croppedCanvas.toDataURL('image/jpeg', 0.92);
                compareAfter.src = previewCanvas.toDataURL('image/jpeg', 0.92);
                compareContainer.style.display = 'block';
                previewCanvas.style.display = 'none';
                updateCompareSliderPosition();
            }
        });
    }

    if (compareRange) {
        compareRange.addEventListener('input', updateCompareSliderPosition);
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
        tempCtx.filter = buildFilterString();
        
        tempCtx.drawImage(getSourceCanvas(), 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
        tempCtx.filter = 'none';
        
        // Apply exposure
        if (adjustments.exposure !== 0) {
            tempCtx.globalAlpha = Math.abs(adjustments.exposure) / 200;
            tempCtx.fillStyle = adjustments.exposure > 0 ? 'white' : 'black';
            tempCtx.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
            tempCtx.globalAlpha = 1;
        }

        drawVignette(tempCtx, PHOTO_WIDTH, PHOTO_HEIGHT);
        
        // Update preview canvas
        previewCanvas.width = PHOTO_WIDTH;
        previewCanvas.height = PHOTO_HEIGHT;
        const ctx = previewCanvas.getContext('2d');
        ctx.drawImage(tempCanvas, 0, 0);
        
        // Regenerate A4 layout
        generateA4Layout();
        
        // Update photo count slider
        updatePhotoCountSlider();

        refreshCompareIfVisible();
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

    // ------------------------------------------------------------------
    // Batch Processing: apply the same crop/adjustments/background/filters
    // to multiple uploaded photos at once.
    // ------------------------------------------------------------------
    let batchFiles = [];
    let batchResults = []; // [{ name, canvas }]

    const batchUpload = document.getElementById('batchUpload');
    const batchListEl = document.getElementById('batchList');
    const processBatchBtn = document.getElementById('processBatch');
    const downloadBatchZipBtn = document.getElementById('downloadBatchZip');
    const downloadBatchPDFBtn = document.getElementById('downloadBatchPDF');
    const batchProgressEl = document.getElementById('batchProgress');

    function loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function centerCropRect(w, h, aspectRatio) {
        let cropW = w;
        let cropH = w / aspectRatio;
        if (cropH > h) {
            cropH = h;
            cropW = h * aspectRatio;
        }
        return { x: (w - cropW) / 2, y: (h - cropH) / 2, width: cropW, height: cropH };
    }

    function sanitizeFileName(name) {
        const base = (name || 'photo').replace(/\.[^/.]+$/, '').replace(/[^a-z0-9_-]/gi, '_');
        return `${base || 'photo'}.jpg`;
    }

    async function processOneBatchFile(file) {
        const img = await loadImageFromFile(file);
        const aspectRatio = PHOTO_WIDTH / PHOTO_HEIGHT;
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        let cropRect = null;
        if (window.PPGFaceDetect) {
            try {
                cropRect = await window.PPGFaceDetect.detectAutoCropRect(img, aspectRatio);
            } catch (err) {
                cropRect = null;
            }
        }
        if (!cropRect) {
            cropRect = centerCropRect(w, h, aspectRatio);
        }

        const cropped = document.createElement('canvas');
        cropped.width = PHOTO_WIDTH;
        cropped.height = PHOTO_HEIGHT;
        cropped.getContext('2d').drawImage(
            img,
            cropRect.x, cropRect.y, cropRect.width, cropRect.height,
            0, 0, PHOTO_WIDTH, PHOTO_HEIGHT
        );

        let source = cropped;
        if (bgRemovalEnabled && window.PPGBackgroundRemoval) {
            const removed = await window.PPGBackgroundRemoval.removeBackground(cropped);
            if (removed) source = removed;
        }

        const out = document.createElement('canvas');
        out.width = PHOTO_WIDTH;
        out.height = PHOTO_HEIGHT;
        const outCtx = out.getContext('2d');

        outCtx.fillStyle = backgroundColor;
        outCtx.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);

        outCtx.filter = buildFilterString();
        outCtx.drawImage(source, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
        outCtx.filter = 'none';

        if (adjustments.exposure !== 0) {
            outCtx.globalAlpha = Math.abs(adjustments.exposure) / 200;
            outCtx.fillStyle = adjustments.exposure > 0 ? 'white' : 'black';
            outCtx.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
            outCtx.globalAlpha = 1;
        }

        drawVignette(outCtx, PHOTO_WIDTH, PHOTO_HEIGHT);

        return out;
    }

    if (batchUpload) {
        batchUpload.addEventListener('change', (e) => {
            batchFiles = Array.from(e.target.files || []);
            batchResults = [];
            batchListEl.innerHTML = batchFiles.length
                ? `<p>${batchFiles.length} photo(s) selected for batch processing.</p>`
                : '';
            processBatchBtn.disabled = batchFiles.length === 0;
            downloadBatchZipBtn.style.display = 'none';
            downloadBatchPDFBtn.style.display = 'none';
            batchProgressEl.textContent = '';
        });
    }

    if (processBatchBtn) {
        processBatchBtn.addEventListener('click', async () => {
            if (batchFiles.length === 0 || !croppedCanvas) return;
            processBatchBtn.disabled = true;
            downloadBatchZipBtn.style.display = 'none';
            downloadBatchPDFBtn.style.display = 'none';
            batchResults = [];

            for (let i = 0; i < batchFiles.length; i++) {
                batchProgressEl.textContent = `Processing ${i + 1} of ${batchFiles.length}…`;
                try {
                    const canvas = await processOneBatchFile(batchFiles[i]);
                    batchResults.push({ name: batchFiles[i].name, canvas });
                } catch (err) {
                    console.warn('Batch: failed to process', batchFiles[i].name, err);
                }
            }

            batchProgressEl.textContent = `✅ Processed ${batchResults.length} of ${batchFiles.length} photo(s).`;
            processBatchBtn.disabled = false;
            downloadBatchZipBtn.style.display = batchResults.length ? 'inline-flex' : 'none';
            downloadBatchPDFBtn.style.display = batchResults.length ? 'inline-flex' : 'none';
        });
    }

    if (downloadBatchZipBtn) {
        downloadBatchZipBtn.addEventListener('click', async () => {
            if (!window.JSZip || batchResults.length === 0) return;
            const zip = new window.JSZip();
            for (const item of batchResults) {
                const blob = await new Promise((resolve) => item.canvas.toBlob(resolve, 'image/jpeg', 1.0));
                zip.file(sanitizeFileName(item.name), blob);
            }
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'passport-photos-batch.zip';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    if (downloadBatchPDFBtn) {
        downloadBatchPDFBtn.addEventListener('click', () => {
            if (!window.jspdf || batchResults.length === 0) return;
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const margin = 60;
            const spacing = 30;
            const availableWidth = A4_WIDTH - 2 * margin;
            const availableHeight = A4_HEIGHT - 2 * margin;
            const perRow = Math.max(1, Math.floor((availableWidth + spacing) / (PHOTO_WIDTH + spacing)));
            const perCol = Math.max(1, Math.floor((availableHeight + spacing) / (PHOTO_HEIGHT + spacing)));
            const perSheet = perRow * perCol;

            batchResults.forEach((item, index) => {
                if (index > 0) pdf.addPage();

                const sheetCanvas = document.createElement('canvas');
                sheetCanvas.width = A4_WIDTH;
                sheetCanvas.height = A4_HEIGHT;
                const sCtx = sheetCanvas.getContext('2d');
                sCtx.fillStyle = 'white';
                sCtx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

                let count = 0;
                for (let row = 0; row < perCol && count < perSheet; row++) {
                    for (let col = 0; col < perRow && count < perSheet; col++) {
                        const x = margin + col * (PHOTO_WIDTH + spacing);
                        const y = margin + row * (PHOTO_HEIGHT + spacing);
                        sCtx.drawImage(item.canvas, x, y, PHOTO_WIDTH, PHOTO_HEIGHT);
                        count++;
                    }
                }

                const imgData = sheetCanvas.toDataURL('image/jpeg', 1.0);
                pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
            });

            pdf.save('passport-photos-batch.pdf');
        });
    }

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
