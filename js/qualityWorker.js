/**
 * QUALITY ANALYSIS WORKER
 * -----------------------
 * Offloads the pixel-level photo quality math (brightness, contrast,
 * sharpness/motion-blur, background uniformity, shadow detection) from the
 * main thread so the live camera preview / coaching UI stays smooth.
 *
 * Runs entirely inside a dedicated Web Worker using OffscreenCanvas.
 * Frames arrive as transferable ImageBitmap objects (created cheaply from
 * the <video> element or a captured still on the main thread) — no pixel
 * data ever needs to cross the thread boundary until it is already
 * on-device analysis output (small numbers), keeping everything local.
 */
/* eslint-env worker */
'use strict';

let canvas = null;
let ctx = null;

function ensureCanvas(w, h) {
    if (!canvas) {
        canvas = new OffscreenCanvas(w, h);
        ctx = canvas.getContext('2d', { willReadFrequently: true });
    } else if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }
}

function analyze(bitmap, sampleW, sampleH) {
    ensureCanvas(sampleW, sampleH);
    ctx.clearRect(0, 0, sampleW, sampleH);
    ctx.drawImage(bitmap, 0, 0, sampleW, sampleH);

    let data;
    try {
        data = ctx.getImageData(0, 0, sampleW, sampleH).data;
    } catch (err) {
        return null;
    }

    const gray = new Float32Array(sampleW * sampleH);
    let sum = 0, sumSq = 0;
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        gray[p] = lum;
        sum += lum;
        sumSq += lum * lum;
    }
    const n = gray.length;
    const brightness = sum / n;
    const variance = sumSq / n - brightness * brightness;
    const contrast = Math.sqrt(Math.max(0, variance));

    // Laplacian-based sharpness / motion-blur estimate.
    let lapSum = 0, lapCount = 0;
    for (let y = 1; y < sampleH - 1; y++) {
        for (let x = 1; x < sampleW - 1; x++) {
            const idx = y * sampleW + x;
            const lap = gray[idx - 1] + gray[idx + 1] + gray[idx - sampleW] + gray[idx + sampleW] - 4 * gray[idx];
            lapSum += lap * lap;
            lapCount++;
        }
    }
    const sharpness = Math.sqrt(lapSum / Math.max(1, lapCount)) / 10;

    // Background uniformity + shadow detection from the border region
    // (assumed to be background in a well-framed passport photo).
    let borderSum = 0, borderSumSq = 0, borderN = 0;
    let leftSum = 0, leftN = 0, rightSum = 0, rightN = 0;
    const border = Math.max(3, Math.round(Math.min(sampleW, sampleH) * 0.06));
    for (let y = 0; y < sampleH; y++) {
        for (let x = 0; x < sampleW; x++) {
            const isBorder = x < border || x >= sampleW - border || y < border || y >= sampleH - border;
            if (!isBorder) continue;
            const idx = y * sampleW + x;
            const v = gray[idx];
            borderSum += v;
            borderSumSq += v * v;
            borderN++;
            if (x < sampleW / 2) { leftSum += v; leftN++; } else { rightSum += v; rightN++; }
        }
    }
    const borderMean = borderSum / Math.max(1, borderN);
    const borderVar = borderSumSq / Math.max(1, borderN) - borderMean * borderMean;
    const borderStd = Math.sqrt(Math.max(0, borderVar));
    const backgroundUniformity = Math.max(0, 1 - borderStd / 60);

    const leftMean = leftSum / Math.max(1, leftN);
    const rightMean = rightSum / Math.max(1, rightN);
    // Large left/right brightness imbalance on the background = one-sided
    // shadow from off-axis lighting.
    const shadowAsymmetry = Math.abs(leftMean - rightMean) / 255;

    return { brightness, contrast, sharpness, backgroundUniformity, shadowAsymmetry, borderMean };
}

self.onmessage = (event) => {
    const { id, bitmap, sampleW, sampleH } = event.data;
    let result = null;
    try {
        result = analyze(bitmap, sampleW || 96, sampleH || 96);
    } catch (err) {
        result = null;
    } finally {
        if (bitmap && bitmap.close) bitmap.close();
    }
    self.postMessage({ id, result });
};
