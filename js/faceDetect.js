/**
 * FACE DETECTION AUTO-CROP (for uploaded photos)
 * -----------------------------------------------
 * Privacy-first, fully client-side face detection used to automatically
 * center and crop a photo the user uploads from disk (not just Live Camera
 * Studio captures). Reuses the same on-device MediaPipe face landmark model
 * already used by js/cameraStudio.js.
 *
 * 🔒 Nothing here ever leaves the browser: the image never gets uploaded,
 * only the (optional) model file is fetched once from a CDN like any other
 * script asset, and all inference runs locally in the page.
 */
(function () {
    'use strict';

    const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
    const WASM_BASE = MEDIAPIPE_CDN + '/wasm';
    const FACE_LANDMARKER_MODEL =
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

    // Same framing heuristics used by the Live Camera Studio, so uploaded
    // photos and camera captures get a consistent auto-crop result.
    const FRAMING = {
        faceHeightIdeal: 0.60,
        eyeLineMin: 0.36,
        eyeLineMax: 0.48
    };

    let faceLandmarker = null;
    let status = 'idle'; // idle | loading | ready | unavailable
    let loadingPromise = null;

    async function ensureFaceLandmarker() {
        if (faceLandmarker || status === 'unavailable') return;
        if (loadingPromise) return loadingPromise;

        status = 'loading';
        loadingPromise = (async () => {
            try {
                const visionModule = await import(/* webpackIgnore: true */ MEDIAPIPE_CDN + '/vision_bundle.mjs');
                const { FaceLandmarker, FilesetResolver } = visionModule;
                const filesetResolver = await FilesetResolver.forVisionTasks(WASM_BASE);
                faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath: FACE_LANDMARKER_MODEL,
                        delegate: 'GPU'
                    },
                    outputFaceBlendshapes: false,
                    outputFacialTransformationMatrixes: false,
                    runningMode: 'IMAGE',
                    numFaces: 1
                });
                status = 'ready';
            } catch (err) {
                console.warn('Face auto-crop: model unavailable (offline or blocked CDN). Falling back to manual crop.', err);
                status = 'unavailable';
                faceLandmarker = null;
            }
        })();
        return loadingPromise;
    }

    /**
     * Detects a single face in the given <img> element and computes a crop
     * rectangle (in natural image pixel coordinates) matching the requested
     * aspect ratio, centered on the face with the eye-line in the ideal zone.
     * Resolves to `null` if detection is unavailable, no face (or more than
     * one face) is found.
     */
    async function detectAutoCropRect(image, aspectRatio) {
        await ensureFaceLandmarker();
        if (!faceLandmarker || !image) return null;

        const w = image.naturalWidth || image.width;
        const h = image.naturalHeight || image.height;
        if (!w || !h) return null;

        let result;
        try {
            result = faceLandmarker.detect(image);
        } catch (err) {
            return null;
        }

        const faces = (result && result.faceLandmarks) || [];
        if (faces.length !== 1) return null; // no face, or multiple faces: let the user crop manually

        const landmarks = faces[0];
        let minX = 1, maxX = 0, minY = 1, maxY = 0;
        for (const p of landmarks) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }

        const faceH = (maxY - minY) * h;
        const centerX = ((minX + maxX) / 2) * w;

        const leftEye = landmarks[468] || landmarks[33];
        const rightEye = landmarks[473] || landmarks[263];
        const eyeY = (leftEye && rightEye) ? ((leftEye.y + rightEye.y) / 2) * h : ((minY + maxY) / 2) * h;

        const cropHeight = Math.min(h, faceH / FRAMING.faceHeightIdeal);
        const cropWidth = Math.min(w, cropHeight * aspectRatio);
        const finalCropHeight = (cropWidth / aspectRatio <= h) ? cropWidth / aspectRatio : h;
        const finalCropWidth = finalCropHeight * aspectRatio;

        const idealEyeLineFromTop = 1 - (FRAMING.eyeLineMin + FRAMING.eyeLineMax) / 2;

        let x = centerX - finalCropWidth / 2;
        let y = eyeY - finalCropHeight * idealEyeLineFromTop;

        x = Math.max(0, Math.min(w - finalCropWidth, x));
        y = Math.max(0, Math.min(h - finalCropHeight, y));

        return { x, y, width: finalCropWidth, height: finalCropHeight };
    }

    /**
     * Runs the (shared, lazily-loaded) MediaPipe Face Landmarker on any
     * image-like source (HTMLImageElement, HTMLCanvasElement, ImageBitmap)
     * and returns the raw 468-point normalized landmark list for a single
     * detected face, or `null` if the model/detection is unavailable.
     * Exposed so other on-device features (e.g. the AI Attire Studio) can
     * reuse the same model instance instead of loading MediaPipe twice.
     */
    async function detectLandmarks(source) {
        await ensureFaceLandmarker();
        if (!faceLandmarker || !source) return null;
        try {
            const result = faceLandmarker.detect(source);
            const faces = (result && result.faceLandmarks) || [];
            return faces.length >= 1 ? faces[0] : null;
        } catch (err) {
            return null;
        }
    }

    function getStatus() {
        return status;
    }

    window.PPGFaceDetect = { detectAutoCropRect, detectLandmarks, getStatus };
})();
