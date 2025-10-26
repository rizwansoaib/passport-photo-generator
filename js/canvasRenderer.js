function drawPassportPhoto(canvas, image, numberOfPhotos) {
    const ctx = canvas.getContext('2d');
    const photoWidth = 297; // A4 width in mm
    const photoHeight = 420; // A4 height in mm
    const margin = 10; // Margin between photos
    const photosPerRow = 2; // Number of photos per row
    const photosPerColumn = 5; // Number of photos per column

    // Set canvas dimensions to A4 size in pixels (assuming 96 DPI)
    canvas.width = photoWidth * 3.7795275591; // Convert mm to pixels
    canvas.height = photoHeight * 3.7795275591; // Convert mm to pixels

    // Calculate the position to draw each photo
    for (let i = 0; i < numberOfPhotos; i++) {
        const x = (i % photosPerRow) * (canvas.width / photosPerRow) + margin;
        const y = Math.floor(i / photosPerRow) * (canvas.height / photosPerColumn) + margin;

        // Draw the image on the canvas
        ctx.drawImage(image, x, y, (canvas.width / photosPerRow) - margin, (canvas.height / photosPerColumn) - margin);
    }
}

export { drawPassportPhoto };