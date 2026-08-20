/**
 * AI BACKGROUND REMOVAL
 * ----------------------
 * Privacy-first, fully client-side background removal using an on-device
 * MediaPipe selfie segmentation model. Used by the Advanced Editor to let
 * users swap their passport photo background for a solid color (white,
 * blue, red, grey or any custom color).
 *
 * 🔒 Nothing here ever leaves the browser: the photo is never uploaded,
 * only the (optional) segmentation model is fetched once from a CDN like
 * any other script asset, and all inference runs locally in the page.
 */
(function () {
    'use strict';

    const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
    const WASM_BASE = MEDIAPIPE_CDN + '/wasm';
    const SELFIE_SEGMENTER_MODEL =
        'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';

    let segmenter = null;
    let status = 'idle'; // idle | loading | ready | unavailable
    let loadingPromise = null;

    async function ensureSegmenter() {
        if (segmenter || status === 'unavailable') return;
        if (loadingPromise) return loadingPromise;

        status = 'loading';
        loadingPromise = (async () => {
            try {
                const visionModule = await import(/* webpackIgnore: true */ MEDIAPIPE_CDN + '/vision_bundle.mjs');
                const { ImageSegmenter, FilesetResolver } = visionModule;
                const filesetResolver = await FilesetResolver.forVisionTasks(WASM_BASE);
                segmenter = await ImageSegmenter.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath: SELFIE_SEGMENTER_MODEL,
                        delegate: 'GPU'
                    },
                    runningMode: 'IMAGE',
                    outputCategoryMask: false,
                    outputConfidenceMasks: true
                });
                status = 'ready';
            } catch (err) {
                console.warn('Background removal: model unavailable (offline or blocked CDN).', err);
                status = 'unavailable';
                segmenter = null;
            }
        })();
        return loadingPromise;
    }

    function getStatus() {
        return status;
    }

    /**
     * Removes the background from `sourceCanvas` using AI person
     * segmentation and returns a new canvas with a transparent background
     * (the caller is responsible for compositing its own background color
     * behind it). Resolves to `null` if segmentation is unavailable or fails.
     */
    async function removeBackground(sourceCanvas) {
        await ensureSegmenter();
        if (!segmenter || !sourceCanvas) return null;

        const w = sourceCanvas.width;
        const h = sourceCanvas.height;
        if (!w || !h) return null;

        let result;
        try {
            result = segmenter.segment(sourceCanvas);
        } catch (err) {
            console.warn('Background removal: segmentation failed.', err);
            return null;
        }

        const confidenceMasks = result && result.confidenceMasks;
        if (!confidenceMasks || confidenceMasks.length === 0) return null;

        const mask = confidenceMasks[0]; // foreground/person confidence, 0..1
        let maskData, maskW, maskH;
        try {
            maskData = mask.getAsFloat32Array();
            maskW = mask.width;
            maskH = mask.height;
        } catch (err) {
            if (mask.close) mask.close();
            return null;
        }

        const outCanvas = document.createElement('canvas');
        outCanvas.width = w;
        outCanvas.height = h;
        const outCtx = outCanvas.getContext('2d');
        outCtx.drawImage(sourceCanvas, 0, 0, w, h);

        const imageData = outCtx.getImageData(0, 0, w, h);
        const pixels = imageData.data;

        for (let y = 0; y < h; y++) {
            const my = Math.min(maskH - 1, Math.floor((y / h) * maskH));
            for (let x = 0; x < w; x++) {
                const mx = Math.min(maskW - 1, Math.floor((x / w) * maskW));
                const confidence = maskData[my * maskW + mx]; // 1 = person, 0 = background
                pixels[(y * w + x) * 4 + 3] = Math.max(0, Math.min(255, Math.round(confidence * 255)));
            }
        }
        outCtx.putImageData(imageData, 0, 0);

        if (mask.close) mask.close();
        return outCanvas;
    }

    window.PPGBackgroundRemoval = { removeBackground, getStatus };
})();
