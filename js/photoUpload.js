// This file handles the photo upload functionality. It exports functions to manage file input, validate the uploaded image, and display the image on the canvas.

const photoInput = document.getElementById('photoInput');
const canvas = document.getElementById('photoCanvas');
const ctx = canvas.getContext('2d');

export function setupPhotoUpload() {
    photoInput.addEventListener('change', handlePhotoUpload);
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (validateImage(file)) {
        const reader = new FileReader();
        reader.onload = function(e) {
            displayImage(e.target.result);
        };
        reader.readAsDataURL(file);
    } else {
        alert('Please upload a valid image file (JPEG or PNG).');
    }
}

function validateImage(file) {
    const validTypes = ['image/jpeg', 'image/png'];
    return file && validTypes.includes(file.type);
}

function displayImage(imageSrc) {
    const img = new Image();
    img.onload = function() {
        const aspectRatio = img.width / img.height;
        const targetWidth = 595; // A4 width in pixels at 72 DPI
        const targetHeight = targetWidth / aspectRatio;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    };
    img.src = imageSrc;
}