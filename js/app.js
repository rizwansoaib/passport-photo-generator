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

    // A4 dimensions in pixels at 300 DPI
    const A4_WIDTH = 2480;
    const A4_HEIGHT = 3508;
    
    const MARGIN = 60;
    const SPACING = 30;
    const DPI = 300;
    const MM_TO_INCH = 25.4;

    // Dynamic photo dimensions (will be updated based on selection)
    let PHOTO_WIDTH = 413;  // Default 35mm at 300 DPI
    let PHOTO_HEIGHT = 531; // Default 45mm at 300 DPI

    let uploadedImages = []; // Array to store multiple images

    // DOM elements
    const photoUpload = document.getElementById('photoUpload');
    const photoSizeSelect = document.getElementById('photoSize');
    const customSizeInputs = document.getElementById('customSizeInputs');
    const customWidth = document.getElementById('customWidth');
    const customHeight = document.getElementById('customHeight');
    const generateBtn = document.getElementById('generatePdf');
    const canvas = document.getElementById('photoCanvas');
    const ctx = canvas.getContext('2d');
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.querySelector('.theme-icon');
    const printBtn = document.getElementById('printBtn');

    // Set canvas dimensions
    canvas.width = A4_WIDTH;
    canvas.height = A4_HEIGHT;

    // Dark Mode functionality
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

    // Event listeners
    photoUpload.addEventListener('change', handleImageUpload);
    generateBtn.addEventListener('click', generatePDF);
    photoSizeSelect.addEventListener('change', handleSizeChange);
    customWidth.addEventListener('input', handleCustomSizeChange);
    customHeight.addEventListener('input', handleCustomSizeChange);
    printBtn.addEventListener('click', printCanvas);

    // Print canvas function
    function printCanvas() {
        // Set page title temporarily to avoid showing URL in print
        const originalTitle = document.title;
        document.title = '';
        
        // Trigger print dialog
        window.print();
        
        // Restore original title after print dialog
        setTimeout(() => {
            document.title = originalTitle;
        }, 100);
    }

    // Helper function to convert mm to pixels
    function mmToPixels(mm) {
        return Math.round((mm / MM_TO_INCH) * DPI);
    }

    // Handle photo size selection change
    function handleSizeChange() {
        const sizeValue = photoSizeSelect.value;
        
        if (sizeValue === 'custom') {
            customSizeInputs.style.display = 'block';
            handleCustomSizeChange();
        } else {
            customSizeInputs.style.display = 'none';
            
            // Update dimensions based on preset
            switch(sizeValue) {
                case '35x45': // India/UK
                    PHOTO_WIDTH = mmToPixels(35);
                    PHOTO_HEIGHT = mmToPixels(45);
                    break;
                case '51x51': // USA
                    PHOTO_WIDTH = mmToPixels(51);
                    PHOTO_HEIGHT = mmToPixels(51);
                    break;
                case '50x70': // Canada
                    PHOTO_WIDTH = mmToPixels(50);
                    PHOTO_HEIGHT = mmToPixels(70);
                    break;
            }
            
            // Re-render preview if images exist
            if (uploadedImages.length > 0) {
                renderPreview();
            }
        }
    }

    // Handle custom size input changes
    function handleCustomSizeChange() {
        const width = parseInt(customWidth.value) || 35;
        const height = parseInt(customHeight.value) || 45;
        
        PHOTO_WIDTH = mmToPixels(width);
        PHOTO_HEIGHT = mmToPixels(height);
        
        // Re-render preview if images exist
        if (uploadedImages.length > 0) {
            renderPreview();
        }
    }

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        addImageFile(file);
        // Reset file input to allow same file upload again
        photoUpload.value = '';
    }

    function addImageFile(file, autoCropRect) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // Add new image to array with default count of 8
                uploadedImages.push({
                    image: img,
                    name: file.name,
                    count: 8
                });
                
                renderPreview();
                updateImageList();
                generateBtn.disabled = false;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        void autoCropRect; // Simple mode shows the full image (no crop step); reserved for future use.
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
                    addImageFile(file, autoCropRect);
                }
            });
        });
    }

    function updateImageList() {
        let existingList = document.getElementById('imageList');
        if (!existingList) {
            existingList = document.createElement('div');
            existingList.id = 'imageList';
            existingList.className = 'image-list';
            document.querySelector('.upload-section').appendChild(existingList);
        }

        existingList.innerHTML = '<h4>Added Photos:</h4>';
        
        uploadedImages.forEach((item, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            
            // Create thumbnail canvas
            const thumbnail = document.createElement('canvas');
            thumbnail.className = 'image-thumbnail';
            thumbnail.width = 60;
            thumbnail.height = 60;
            const thumbCtx = thumbnail.getContext('2d');
            
            // Draw thumbnail
            const imgAspect = item.image.width / item.image.height;
            let thumbWidth, thumbHeight, offsetX = 0, offsetY = 0;
            
            if (imgAspect > 1) {
                thumbHeight = 60;
                thumbWidth = 60 * imgAspect;
                offsetX = -(thumbWidth - 60) / 2;
            } else {
                thumbWidth = 60;
                thumbHeight = 60 / imgAspect;
                offsetY = -(thumbHeight - 60) / 2;
            }
            
            thumbCtx.drawImage(item.image, offsetX, offsetY, thumbWidth, thumbHeight);
            
            imageItem.innerHTML = `
                <span class="image-name">${index + 1}. ${item.name}</span>
                <input type="number" class="image-count" data-index="${index}" value="${item.count}" min="1" max="30" />
                <button class="remove-btn" data-index="${index}">Remove</button>
            `;
            
            // Insert thumbnail at the beginning
            imageItem.insertBefore(thumbnail, imageItem.firstChild);
            
            existingList.appendChild(imageItem);
        });

        // Add event listeners to count inputs and remove buttons
        document.querySelectorAll('.image-count').forEach(input => {
            input.addEventListener('input', handleCountChange);
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', handleRemoveImage);
        });
    }

    function handleCountChange(event) {
        const index = parseInt(event.target.dataset.index);
        const newCount = parseInt(event.target.value) || 1;
        uploadedImages[index].count = newCount;
        renderPreview();
    }

    function handleRemoveImage(event) {
        const index = parseInt(event.target.dataset.index);
        uploadedImages.splice(index, 1);
        
        if (uploadedImages.length === 0) {
            generateBtn.disabled = true;
            generateBtn.style.display = 'none';
            printBtn.style.display = 'none';
            const imageList = document.getElementById('imageList');
            if (imageList) imageList.remove();
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);
        } else {
            updateImageList();
            renderPreview();
        }
    }

    function renderPreview() {
        if (uploadedImages.length === 0) {
            printBtn.style.display = 'none';
            generateBtn.style.display = 'none';
            return;
        }

        // Show print and generate buttons
        printBtn.style.display = 'inline-flex';
        generateBtn.style.display = 'inline-flex';

        // Clear canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

        // Calculate how many photos fit per row and column
        const availableWidth = A4_WIDTH - (2 * MARGIN);
        const availableHeight = A4_HEIGHT - (2 * MARGIN);
        
        const photosPerRow = Math.floor((availableWidth + SPACING) / (PHOTO_WIDTH + SPACING));
        const photosPerCol = Math.floor((availableHeight + SPACING) / (PHOTO_HEIGHT + SPACING));
        
        let currentImageIndex = 0;
        let currentImageCount = 0;

        for (let row = 0; row < photosPerCol; row++) {
            for (let col = 0; col < photosPerRow; col++) {
                if (currentImageIndex >= uploadedImages.length) break;

                const x = MARGIN + col * (PHOTO_WIDTH + SPACING);
                const y = MARGIN + row * (PHOTO_HEIGHT + SPACING);

                const currentItem = uploadedImages[currentImageIndex];

                // Draw photo without cropping or zooming - show entire original
                drawPhoto(currentItem.image, x, y, PHOTO_WIDTH, PHOTO_HEIGHT);

                currentImageCount++;
                
                // Move to next image if current count is reached
                if (currentImageCount >= currentItem.count) {
                    currentImageIndex++;
                    currentImageCount = 0;
                }
            }
            if (currentImageIndex >= uploadedImages.length) break;
        }
    }

    function drawPhoto(img, x, y, width, height) {
        // Calculate scaling to fit entire image within the box (contain mode)
        const imgAspect = img.width / img.height;
        const boxAspect = width / height;

        let drawWidth, drawHeight, offsetX, offsetY;

        // Scale to fit the entire image without cropping
        if (imgAspect > boxAspect) {
            // Image is wider - fit by width
            drawWidth = width;
            drawHeight = width / imgAspect;
            offsetX = 0;
            offsetY = (height - drawHeight) / 2;
        } else {
            // Image is taller - fit by height
            drawHeight = height;
            drawWidth = height * imgAspect;
            offsetX = (width - drawWidth) / 2;
            offsetY = 0;
        }

        // Fill background with white in case image doesn't fill the box
        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, width, height);

        // Draw the entire image without clipping - no zoom, no crop
        ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
    }

    function generatePDF() {
        if (uploadedImages.length === 0) {
            alert('Please upload at least one photo!');
            return;
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Convert canvas to image
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        // Add image to PDF (A4 size: 210mm x 297mm)
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        
        // Save PDF
        const timestamp = new Date().toISOString().slice(0, 10);
        pdf.save(`passport-photos-${timestamp}.pdf`);
    }

    // Initial state
    generateBtn.disabled = true;

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