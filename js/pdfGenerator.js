function generatePDF(photos, numberOfPhotos) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('portrait', 'mm', 'a4');
    const photoWidth = 50; // Width of the passport photo
    const photoHeight = 70; // Height of the passport photo
    const margin = 10; // Margin around the photos
    const cols = 2; // Number of columns
    const rows = Math.ceil(numberOfPhotos / cols); // Calculate number of rows needed

    for (let i = 0; i < numberOfPhotos; i++) {
        const x = (i % cols) * (photoWidth + margin) + margin;
        const y = Math.floor(i / cols) * (photoHeight + margin) + margin;

        if (photos[i]) {
            pdf.addImage(photos[i], 'JPEG', x, y, photoWidth, photoHeight);
        }
    }

    pdf.save('passport-photos.pdf');
}

export { generatePDF };