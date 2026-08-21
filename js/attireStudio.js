/**
 * AI PROFESSIONAL ATTIRE STUDIO
 * ------------------------------
 * Client-side, privacy-first virtual attire & hijab/headscarf compositor.
 *
 * Everything here runs on-device: face geometry comes from the MediaPipe
 * Face Landmarker (shared with js/faceDetect.js, GPU/WASM inference in the
 * browser), clothing/hijab shapes are drawn procedurally with Canvas 2D
 * (no photos, landmarks or biometric data are ever uploaded anywhere), and
 * the original photo is never modified in place — attire is composited as
 * an extra non-destructive layer on top of a *copy* of the source canvas.
 *
 * Layer order (spec): Original Image -> Face Protection -> Clothing ->
 * Hijab -> Background -> Lighting -> Enhancement -> Final Crop.
 * "Background/Lighting/Enhancement/Final Crop" for the base photo are
 * already handled by js/editor.js (background removal, filters, vignette,
 * crop); this module owns the Face Protection + Clothing + Hijab layers
 * and applies a lighting-harmonization tint to those two layers so they
 * blend into the photo's existing illumination.
 */
(function () {
    'use strict';

    // Standard MediaPipe FaceMesh face-oval contour, in point order forming
    // a closed loop. Used to build the "Face Safety Mask" that clothing and
    // hijab layers are never allowed to paint over.
    const FACE_OVAL_IDX = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365,
        379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93,
        234, 127, 162, 21, 54, 103, 67, 109
    ];

    const LEFT_EYE = { top: 159, bottom: 145, left: 33, right: 133 };
    const RIGHT_EYE = { top: 386, bottom: 374, left: 362, right: 263 };
    const NOSE_TIP = 1;
    const CHIN = 152;
    const MOUTH_LEFT = 61, MOUTH_RIGHT = 291;
    const JAW_LEFT = 234, JAW_RIGHT = 454;
    const FOREHEAD_TOP = 10;

    const DEFAULTS = {
        enabled: false,
        countryId: 'india',
        documentId: 'passport',
        attireId: null,
        attireColor: null,
        hijabId: null,
        hijabColor: '#1c1c1e',
        clothing: { visible: true, opacity: 1 },
        hijab: { visible: true, opacity: 1 },
        edgeSoftness: 6,     // px feather radius
        scale: 1,            // manual fine-scale adjustment
        offsetX: 0,           // manual nudge, in fraction of face width
        offsetY: 0
    };

    let state = JSON.parse(JSON.stringify(DEFAULTS));
    let onReadyCallback = null;

    // ---- landmark cache: MediaPipe inference is the only async/slow step;
    // once landmarks are known, every attire/color/opacity change is a pure,
    // synchronous Canvas 2D redraw. ----
    const landmarkCache = { source: null, landmarks: null, w: 0, h: 0, pending: false };
    const composedCache = { key: null, canvas: null };

    function isMediaPipeAvailable() {
        return !!(window.PPGFaceDetect);
    }

    async function ensureLandmarks(sourceCanvas) {
        if (!sourceCanvas) return null;
        if (landmarkCache.source === sourceCanvas && landmarkCache.landmarks) {
            return landmarkCache.landmarks;
        }
        if (landmarkCache.pending) return null;
        landmarkCache.pending = true;
        try {
            const landmarks = isMediaPipeAvailable()
                ? await window.PPGFaceDetect.detectLandmarks(sourceCanvas)
                : null;
            landmarkCache.source = sourceCanvas;
            landmarks_toCache(landmarks, sourceCanvas);
            return landmarks;
        } finally {
            landmarkCache.pending = false;
            if (onReadyCallback) onReadyCallback();
        }
    }

    function landmarks_toCache(landmarks, sourceCanvas) {
        landmarkCache.landmarks = landmarks;
        landmarkCache.w = sourceCanvas.width;
        landmarkCache.h = sourceCanvas.height;
    }

    function pt(landmarks, idx, w, h) {
        const p = landmarks[idx];
        return p ? { x: p.x * w, y: p.y * h } : null;
    }

    // ------------------------------------------------------------------
    // Face Safety Mask + pose estimation
    // ------------------------------------------------------------------
    function buildFaceOvalPoints(landmarks, w, h, expand) {
        const pts = FACE_OVAL_IDX.map((i) => pt(landmarks, i, w, h)).filter(Boolean);
        if (!pts.length) return [];
        if (!expand) return pts;
        let cx = 0, cy = 0;
        pts.forEach((p) => { cx += p.x; cy += p.y; });
        cx /= pts.length; cy /= pts.length;
        return pts.map((p) => ({
            x: p.x + (p.x - cx) * expand,
            y: p.y + (p.y - cy) * expand
        }));
    }

    function facePathFromPoints(ctx, points) {
        ctx.beginPath();
        points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
    }

    /**
     * Estimates shoulder/neck/upper-torso geometry from face landmarks
     * alone (no dedicated body-pose model is bundled), using well-known
     * anthropometric ratios (shoulder width ≈ 2.2-2.6x face width, neck
     * top at the chin, shoulder line ≈ 1.0-1.3x face height below the
     * chin). This keeps the studio 100% client-side without a second,
     * heavier pose-detection model while still auto-aligning attire.
     */
    function computePose(landmarks, w, h) {
        const jawL = pt(landmarks, JAW_LEFT, w, h);
        const jawR = pt(landmarks, JAW_RIGHT, w, h);
        const chin = pt(landmarks, CHIN, w, h);
        const top = pt(landmarks, FOREHEAD_TOP, w, h);
        if (!jawL || !jawR || !chin || !top) return null;

        const faceWidth = Math.hypot(jawR.x - jawL.x, jawR.y - jawL.y);
        const faceHeight = Math.hypot(chin.x - top.x, chin.y - top.y);
        const centerX = (jawL.x + jawR.x) / 2;

        const neckTopY = chin.y;
        const neckWidth = faceWidth * 0.62;
        const shoulderY = chin.y + faceHeight * 0.95;
        const shoulderWidth = faceWidth * 2.3;
        const torsoBottomY = h; // extend clothing to the bottom of the frame

        return {
            centerX, faceWidth, faceHeight,
            neckTopY, neckWidth,
            shoulderY, shoulderWidth,
            torsoBottomY,
            headTopY: top.y
        };
    }

    // ------------------------------------------------------------------
    // Lighting harmonization: sample the photo's own tone near the neck
    // so clothing/hijab shading matches the existing illumination instead
    // of looking "pasted on".
    // ------------------------------------------------------------------
    function sampleLighting(sourceCanvas, pose) {
        try {
            const ctx = sourceCanvas.getContext('2d');
            const sampleW = 24, sampleH = 12;
            const sx = Math.max(0, Math.min(sourceCanvas.width - sampleW, pose.centerX - sampleW / 2));
            const sy = Math.max(0, Math.min(sourceCanvas.height - sampleH, pose.neckTopY - sampleH / 2));
            const data = ctx.getImageData(sx, sy, sampleW, sampleH).data;
            let sum = 0, leftSum = 0, rightSum = 0, n = 0, half = 0;
            for (let i = 0; i < data.length; i += 4) {
                const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                sum += lum; n++;
                const px = (i / 4) % sampleW;
                if (px < sampleW / 2) { leftSum += lum; half++; } else { rightSum += lum; }
            }
            const brightness = sum / Math.max(1, n);
            const asymmetry = (leftSum / Math.max(1, half)) - (rightSum / Math.max(1, n - half));
            return {
                brightness: brightness / 255,       // 0..1
                shadowSide: asymmetry > 4 ? 'left' : asymmetry < -4 ? 'right' : 'none'
            };
        } catch (err) {
            return { brightness: 0.6, shadowSide: 'none' };
        }
    }

    function shadeColor(hex, amount) {
        const c = hex.replace('#', '');
        const num = parseInt(c.length === 3 ? c.split('').map((x) => x + x).join('') : c, 16);
        let r = (num >> 16) + amount, g = ((num >> 8) & 0xff) + amount, b = (num & 0xff) + amount;
        r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
        return `rgb(${r},${g},${b})`;
    }

    // ------------------------------------------------------------------
    // Procedural clothing renderers (drawn on a transparent offscreen
    // layer, then edge-feathered as a whole before compositing).
    // ------------------------------------------------------------------
    function torsoOutline(pose, opts) {
        const cx = pose.centerX + pose.faceWidth * state.offsetX;
        const nw = pose.neckWidth * (opts.neckWidthMult || 1) * state.scale;
        const sw = pose.shoulderWidth * (opts.shoulderWidthMult || 1) * state.scale;
        const neckY = pose.neckTopY + pose.faceHeight * state.offsetY - pose.faceHeight * 0.02;
        const shoulderY = pose.shoulderY + pose.faceHeight * state.offsetY;
        return {
            cx, nw, sw, neckY, shoulderY,
            bottomY: pose.torsoBottomY,
            bottomWidth: sw * 1.08
        };
    }

    function drawShirtShape(ctx, pose, color, opts) {
        const t = torsoOutline(pose, opts || {});
        const collarDrop = pose.faceHeight * 0.22;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(t.cx - t.nw / 2, t.neckY);
        ctx.lineTo(t.cx - t.sw / 2, t.shoulderY);
        ctx.lineTo(t.cx - t.bottomWidth / 2, t.bottomY);
        ctx.lineTo(t.cx + t.bottomWidth / 2, t.bottomY);
        ctx.lineTo(t.cx + t.sw / 2, t.shoulderY);
        ctx.lineTo(t.cx + t.nw / 2, t.neckY);
        // Collar V-notch
        ctx.lineTo(t.cx, t.neckY + collarDrop);
        ctx.closePath();
        ctx.fill();

        // subtle lighting-driven shading down each side
        const grad = ctx.createLinearGradient(t.cx - t.sw / 2, 0, t.cx + t.sw / 2, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0.12)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        grad.addColorStop(1, 'rgba(0,0,0,0.12)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(t.cx - t.nw / 2, t.neckY);
        ctx.lineTo(t.cx - t.sw / 2, t.shoulderY);
        ctx.lineTo(t.cx - t.bottomWidth / 2, t.bottomY);
        ctx.lineTo(t.cx + t.bottomWidth / 2, t.bottomY);
        ctx.lineTo(t.cx + t.sw / 2, t.shoulderY);
        ctx.lineTo(t.cx + t.nw / 2, t.neckY);
        ctx.lineTo(t.cx, t.neckY + collarDrop);
        ctx.closePath();
        ctx.fill();

        return t;
    }

    function drawLapels(ctx, pose, t, color) {
        const collarDrop = pose.faceHeight * 0.55;
        const lapelWidth = t.sw * 0.22;
        ctx.fillStyle = shadeColor(color, -18);
        // left lapel
        ctx.beginPath();
        ctx.moveTo(t.cx - t.nw / 2, t.neckY);
        ctx.lineTo(t.cx - lapelWidth, t.neckY + collarDrop);
        ctx.lineTo(t.cx - t.nw / 4, t.neckY + collarDrop * 0.55);
        ctx.lineTo(t.cx, t.neckY + collarDrop * 0.85);
        ctx.closePath();
        ctx.fill();
        // right lapel
        ctx.beginPath();
        ctx.moveTo(t.cx + t.nw / 2, t.neckY);
        ctx.lineTo(t.cx + lapelWidth, t.neckY + collarDrop);
        ctx.lineTo(t.cx + t.nw / 4, t.neckY + collarDrop * 0.55);
        ctx.lineTo(t.cx, t.neckY + collarDrop * 0.85);
        ctx.closePath();
        ctx.fill();
    }

    function drawBlazerShape(ctx, pose, color, opts) {
        const t = drawShirtShape(ctx, pose, color, Object.assign({ shoulderWidthMult: 1.12 }, opts));
        drawLapels(ctx, pose, t, color);
        return t;
    }

    function drawSuitShape(ctx, pose, color, opts) {
        // A visible shirt-white sliver under a blazer for a "suit" look.
        drawShirtShape(ctx, pose, '#f2f3f5', Object.assign({ neckWidthMult: 0.9 }, opts));
        return drawBlazerShape(ctx, pose, color, opts);
    }

    function drawCoatShape(ctx, pose, color, opts) {
        const t = drawShirtShape(ctx, pose, color, Object.assign({ shoulderWidthMult: 1.2 }, opts));
        // Rounded coat collar instead of sharp lapels
        ctx.fillStyle = shadeColor(color, -22);
        ctx.beginPath();
        ctx.ellipse(t.cx, t.neckY + pose.faceHeight * 0.12, t.nw * 0.85, pose.faceHeight * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
        return t;
    }

    function drawTieShape(ctx, pose, color) {
        const t = torsoOutline(pose, {});
        const knotY = t.neckY + pose.faceHeight * 0.08;
        const tipY = Math.min(t.bottomY, t.neckY + pose.faceHeight * 1.6);
        const knotW = pose.faceWidth * 0.11;
        const tipW = pose.faceWidth * 0.075;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(t.cx - knotW / 2, knotY);
        ctx.lineTo(t.cx + knotW / 2, knotY);
        ctx.lineTo(t.cx + tipW / 2, tipY - pose.faceHeight * 0.15);
        ctx.lineTo(t.cx, tipY);
        ctx.lineTo(t.cx - tipW / 2, tipY - pose.faceHeight * 0.15);
        ctx.closePath();
        ctx.fill();
    }

    function drawBowtieShape(ctx, pose, color) {
        const t = torsoOutline(pose, {});
        const y = t.neckY + pose.faceHeight * 0.1;
        const w = pose.faceWidth * 0.22, h = pose.faceHeight * 0.12;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(t.cx, y);
        ctx.lineTo(t.cx - w, y - h / 2);
        ctx.lineTo(t.cx - w, y + h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(t.cx, y);
        ctx.lineTo(t.cx + w, y - h / 2);
        ctx.lineTo(t.cx + w, y + h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = shadeColor(color, -25);
        ctx.beginPath();
        ctx.ellipse(t.cx, y, w * 0.16, h * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    function punchFaceSafety(ctx, landmarks, w, h, marginFraction) {
        const pts = buildFaceOvalPoints(landmarks, w, h, marginFraction || 0.015);
        if (!pts.length) return;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        facePathFromPoints(ctx, pts);
        ctx.fill();
        ctx.restore();
    }

    function drawClothingShape(ctx, shape, pose, color) {
        switch (shape) {
            case 'shirt': case 'blouse': return drawShirtShape(ctx, pose, color, {});
            case 'blazer': return drawBlazerShape(ctx, pose, color, {});
            case 'suit': return drawSuitShape(ctx, pose, color, {});
            case 'coat': return drawCoatShape(ctx, pose, color, {});
            case 'tie': return drawTieShape(ctx, pose, color);
            case 'bowtie': return drawBowtieShape(ctx, pose, color);
            default: return null;
        }
    }

    // ------------------------------------------------------------------
    // Hijab / headscarf renderer — always punched with the Face Safety
    // Mask (destination-out) so eyes/eyebrows/nose/mouth/chin stay
    // visible, regardless of style/coverage/scale settings.
    // ------------------------------------------------------------------
    function drawHijabShape(ctx, landmarks, pose, w, h, hijabDef, color) {
        const coverage = hijabDef.coverage;
        const frameMargin = hijabDef.frame * pose.faceWidth;
        const ovalOuter = buildFaceOvalPoints(landmarks, w, h, frameMargin / pose.faceWidth);
        if (!ovalOuter.length) return;

        const headTop = pose.headTopY - pose.faceHeight * 0.32;
        const cx = pose.centerX + pose.faceWidth * state.offsetX;
        const hoodWidth = pose.faceWidth * (1.55 * state.scale);
        const shoulderY = pose.shoulderY + pose.faceHeight * (0.15 + coverage) + pose.faceHeight * state.offsetY;

        // Hood + shoulder drape silhouette (drawn generously; the face
        // oval hole below guarantees it never obscures the face).
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(cx - hoodWidth * 0.42, headTop + pose.faceHeight * 0.15);
        ctx.quadraticCurveTo(cx - hoodWidth / 2, headTop - pose.faceHeight * 0.1, cx, headTop - pose.faceHeight * 0.18);
        ctx.quadraticCurveTo(cx + hoodWidth / 2, headTop - pose.faceHeight * 0.1, cx + hoodWidth * 0.42, headTop + pose.faceHeight * 0.15);
        ctx.lineTo(cx + pose.shoulderWidth * 0.62, shoulderY);
        ctx.quadraticCurveTo(cx, shoulderY + pose.faceHeight * 0.3, cx - pose.shoulderWidth * 0.62, shoulderY);
        ctx.closePath();
        ctx.fill();

        // Soft shading for fabric folds
        const grad = ctx.createLinearGradient(cx - hoodWidth / 2, 0, cx + hoodWidth / 2, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0.18)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
        grad.addColorStop(1, 'rgba(0,0,0,0.18)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Punch the protected face region back out (guarantee eyes, nose,
        // mouth, chin and the sides of the face remain fully visible).
        punchFaceSafety(ctx, landmarks, w, h, hijabDef.frame);
    }

    // ------------------------------------------------------------------
    // Compose: builds an offscreen "Clothing" layer and "Hijab" layer,
    // feathers their edges (edgeSoftness), harmonizes lighting, and
    // composites both on top of a copy of the source photo.
    // ------------------------------------------------------------------
    function composeSignature(w, h) {
        return JSON.stringify({
            w, h,
            e: state.enabled, a: state.attireId, ac: state.attireColor,
            hi: state.hijabId, hc: state.hijabColor,
            cv: state.clothing, hv: state.hijab,
            es: state.edgeSoftness, sc: state.scale, ox: state.offsetX, oy: state.offsetY
        });
    }

    function buildLayer(w, h, drawFn) {
        const layer = document.createElement('canvas');
        layer.width = w; layer.height = h;
        const lctx = layer.getContext('2d');
        drawFn(lctx);
        if (state.edgeSoftness > 0) {
            const feathered = document.createElement('canvas');
            feathered.width = w; feathered.height = h;
            const fctx = feathered.getContext('2d');
            fctx.filter = `blur(${state.edgeSoftness}px)`;
            fctx.drawImage(layer, 0, 0);
            return feathered;
        }
        return layer;
    }

    function compose(sourceCanvas) {
        if (!state.enabled) return null;
        const landmarks = landmarkCache.source === sourceCanvas ? landmarkCache.landmarks : null;
        if (!landmarks) return null;

        const w = sourceCanvas.width, h = sourceCanvas.height;
        const sig = composeSignature(w, h);
        if (composedCache.key === sig && composedCache.canvas) return composedCache.canvas;

        const pose = computePose(landmarks, w, h);
        if (!pose) return null;
        const lighting = sampleLighting(sourceCanvas, pose);
        const tint = lighting.brightness < 0.4 ? -20 : lighting.brightness > 0.75 ? 12 : 0;

        const out = document.createElement('canvas');
        out.width = w; out.height = h;
        const ctx = out.getContext('2d');
        ctx.drawImage(sourceCanvas, 0, 0);

        const attire = state.attireId && window.PPGAttireCatalog
            ? window.PPGAttireCatalog.findAttire(state.countryId, state.attireId)
            : null;

        if (attire && state.clothing.visible) {
            const color = shadeColor(state.attireColor || attire.defaultColor, tint);
            const layer = buildLayer(w, h, (lctx) => {
                drawClothingShape(lctx, attire.shape, pose, color);
                // Face Safety Mask: guarantee clothing can never paint over
                // the protected face region, even if a shape's geometry
                // extends higher than expected on an unusual crop.
                punchFaceSafety(lctx, landmarks, w, h, 0.01);
            });
            ctx.save();
            ctx.globalAlpha = state.clothing.opacity;
            ctx.drawImage(layer, 0, 0);
            ctx.restore();
        }

        const hijab = state.hijabId && window.PPGAttireCatalog
            ? window.PPGAttireCatalog.findHijab(state.hijabId)
            : null;

        if (hijab && state.hijab.visible) {
            const color = shadeColor(state.hijabColor, tint);
            const layer = buildLayer(w, h, (lctx) => drawHijabShape(lctx, landmarks, pose, w, h, hijab, color));
            ctx.save();
            ctx.globalAlpha = state.hijab.opacity;
            ctx.drawImage(layer, 0, 0);
            ctx.restore();
        }

        composedCache.key = sig;
        composedCache.canvas = out;
        return out;
    }

    // ------------------------------------------------------------------
    // AI Photo Doctor (attire-aware): 0-100 quality score covering face
    // visibility/eyes/gaze/head pose/framing/lighting/background/
    // sharpness/resolution/attire occlusion.
    // ------------------------------------------------------------------
    function eyeOpenness(landmarks, eye, w, h) {
        const top = pt(landmarks, eye.top, w, h), bottom = pt(landmarks, eye.bottom, w, h);
        const left = pt(landmarks, eye.left, w, h), right = pt(landmarks, eye.right, w, h);
        if (!top || !bottom || !left || !right) return null;
        const vert = Math.hypot(top.x - bottom.x, top.y - bottom.y);
        const horiz = Math.hypot(left.x - right.x, left.y - right.y);
        return horiz > 0 ? vert / horiz : null;
    }

    function runPhotoDoctor(sourceCanvas) {
        const w = sourceCanvas.width, h = sourceCanvas.height;
        const landmarks = landmarkCache.source === sourceCanvas ? landmarkCache.landmarks : null;
        const issues = [];
        const fixes = [];
        const scores = {};

        if (!landmarks) {
            scores.faceVisibility = 0;
            issues.push('No face detected — make sure the face is clearly visible and unobstructed.');
        } else {
            scores.faceVisibility = 100;
            const leftEAR = eyeOpenness(landmarks, LEFT_EYE, w, h);
            const rightEAR = eyeOpenness(landmarks, RIGHT_EYE, w, h);
            const avgEAR = (leftEAR != null && rightEAR != null) ? (leftEAR + rightEAR) / 2 : null;
            if (avgEAR != null) {
                scores.eyeOpenness = Math.max(0, Math.min(100, Math.round((avgEAR / 0.32) * 100)));
                if (scores.eyeOpenness < 55) { issues.push('Eyes may be partially closed.'); fixes.push('Retake with eyes fully open, looking at the camera.'); }
            } else {
                scores.eyeOpenness = 60;
            }

            const nose = pt(landmarks, NOSE_TIP, w, h);
            const chin = pt(landmarks, CHIN, w, h);
            const jawL = pt(landmarks, JAW_LEFT, w, h);
            const jawR = pt(landmarks, JAW_RIGHT, w, h);
            const mouthL = pt(landmarks, MOUTH_LEFT, w, h);
            const mouthR = pt(landmarks, MOUTH_RIGHT, w, h);

            if (nose && jawL && jawR) {
                const jawMidX = (jawL.x + jawR.x) / 2;
                const yaw = Math.abs(nose.x - jawMidX) / Math.max(1, Math.hypot(jawR.x - jawL.x, jawR.y - jawL.y));
                scores.headPose = Math.max(0, Math.min(100, Math.round(100 - yaw * 260)));
                if (scores.headPose < 60) { issues.push('Head appears turned/tilted.'); fixes.push('Face the camera directly with a level head pose.'); }
            }

            if (mouthL && mouthR && chin && landmarks[10]) {
                const faceH = Math.hypot(chin.x - pt(landmarks, 10, w, h).x, chin.y - pt(landmarks, 10, w, h).y);
                const faceCx = (jawL && jawR) ? (jawL.x + jawR.x) / 2 : w / 2;
                const centering = 1 - Math.abs(faceCx - w / 2) / (w / 2);
                scores.centering = Math.max(0, Math.min(100, Math.round(centering * 100)));
                scores.framing = Math.max(0, Math.min(100, Math.round(100 - Math.abs((faceH / h) - 0.62) * 260)));
                if (scores.framing < 60) { issues.push('Face size in frame is not ideal.'); fixes.push('Recrop so the face fills roughly 60-70% of the photo height.'); }
            }

            if (state.enabled && (state.attireId || state.hijabId)) {
                scores.attireQuality = 90; // procedural attire is generated clipped from the Face Safety Mask by construction
            }
        }

        // Pixel-level checks (sharpness, brightness, background uniformity)
        try {
            const ctx = sourceCanvas.getContext('2d');
            const sw = Math.min(120, w), sh = Math.min(120, h);
            const tmp = document.createElement('canvas'); tmp.width = sw; tmp.height = sh;
            tmp.getContext('2d').drawImage(sourceCanvas, 0, 0, sw, sh);
            const data = tmp.getContext('2d').getImageData(0, 0, sw, sh).data;
            let sum = 0, sumSq = 0, lapSum = 0, lapN = 0;
            const gray = new Float32Array(sw * sh);
            for (let i = 0, p = 0; i < data.length; i += 4, p++) {
                const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                gray[p] = lum; sum += lum; sumSq += lum * lum;
            }
            const n = gray.length;
            const brightness = sum / n;
            scores.lighting = Math.max(0, Math.min(100, Math.round(100 - Math.abs(brightness - 150) / 1.5)));
            for (let y = 1; y < sh - 1; y++) {
                for (let x = 1; x < sw - 1; x++) {
                    const idx = y * sw + x;
                    const lap = gray[idx - 1] + gray[idx + 1] + gray[idx - sw] + gray[idx + sw] - 4 * gray[idx];
                    lapSum += lap * lap; lapN++;
                }
            }
            const sharp = Math.sqrt(lapSum / Math.max(1, lapN));
            scores.sharpness = Math.max(0, Math.min(100, Math.round(sharp * 3)));
            if (scores.sharpness < 45) { issues.push('Image looks soft/blurry.'); fixes.push('Use better lighting or hold the camera steadier, then retake.'); }
            scores.resolution = Math.max(0, Math.min(100, Math.round((Math.min(w, h) / 600) * 100)));
            if (scores.resolution < 50) issues.push('Resolution is low for high-quality printing.');

            const border = Math.max(2, Math.round(Math.min(sw, sh) * 0.06));
            let bSum = 0, bSumSq = 0, bN = 0;
            for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
                if (x < border || x >= sw - border || y < border || y >= sh - border) {
                    const v = gray[y * sw + x]; bSum += v; bSumSq += v * v; bN++;
                }
            }
            const bMean = bSum / Math.max(1, bN);
            const bStd = Math.sqrt(Math.max(0, bSumSq / Math.max(1, bN) - bMean * bMean));
            scores.background = Math.max(0, Math.min(100, Math.round(100 - bStd * 2)));
            if (scores.background < 55) { issues.push('Background isn\'t uniform.'); fixes.push('Use a plain, evenly-lit background or enable AI background removal.'); }
        } catch (err) { /* ignore, canvas may be tainted */ }

        const weights = { faceVisibility: 1.4, eyeOpenness: 1, headPose: 1.1, centering: 0.8, framing: 1.1, lighting: 1, background: 1, sharpness: 1.1, resolution: 0.6, attireQuality: 0.6 };
        let sum = 0, wsum = 0;
        Object.keys(weights).forEach((k) => {
            if (scores[k] !== undefined) { sum += scores[k] * weights[k]; wsum += weights[k]; }
        });
        const overall = wsum > 0 ? Math.round(sum / wsum) : 0;

        return { score: overall, categories: scores, issues, fixes };
    }

    // ------------------------------------------------------------------
    // Recommendation engine
    // ------------------------------------------------------------------
    function recommend() {
        const doc = window.PPGCountryPresets
            ? window.PPGCountryPresets.getDocument(state.countryId, state.documentId)
            : null;
        if (!doc) return null;
        const items = (window.PPGAttireCatalog ? window.PPGAttireCatalog.byCountry(state.countryId) : [])
            .filter((a) => doc.attireCategories.includes(a.category))
            .slice(0, 4);
        return {
            documentLabel: doc.label,
            background: doc.background,
            guidance: doc.attireGuidance,
            suggested: items,
            disclaimer: window.PPGCountryPresets.DISCLAIMER
        };
    }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------
    function init(options) {
        onReadyCallback = (options && options.onReady) || null;
    }

    function setSourceCanvas(canvas) {
        composedCache.key = null; composedCache.canvas = null;
        landmarkCache.source = null; landmarkCache.landmarks = null;
        if (canvas) ensureLandmarks(canvas);
    }

    function invalidate() { composedCache.key = null; composedCache.canvas = null; }

    function setEnabled(v) { state.enabled = !!v; invalidate(); }
    function isEnabled() { return state.enabled; }

    function setCountry(id) { state.countryId = id; invalidate(); }
    function setDocument(id) { state.documentId = id; invalidate(); }
    function setAttire(id, color) { state.attireId = id; if (color) state.attireColor = color; invalidate(); }
    function setAttireColor(color) { state.attireColor = color; invalidate(); }
    function setHijab(id) { state.hijabId = id; invalidate(); }
    function setHijabColor(color) { state.hijabColor = color; invalidate(); }
    function clearAttire() { state.attireId = null; invalidate(); }
    function clearHijab() { state.hijabId = null; invalidate(); }

    function setLayer(layer, props) {
        if (state[layer]) Object.assign(state[layer], props);
        invalidate();
    }

    function setEdgeSoftness(px) { state.edgeSoftness = Math.max(0, px); invalidate(); }
    function setTransform(t) { Object.assign(state, t); invalidate(); }

    function restoreOriginal() {
        state.enabled = false;
        state.attireId = null;
        state.hijabId = null;
        invalidate();
    }

    function getState() { return JSON.parse(JSON.stringify(state)); }

    async function runPhotoDoctorAsync(sourceCanvas) {
        if (!sourceCanvas) return runPhotoDoctor(sourceCanvas);
        if (landmarkCache.source !== sourceCanvas) {
            await ensureLandmarks(sourceCanvas);
        }
        return runPhotoDoctor(sourceCanvas);
    }

    function getOutputCanvas(sourceCanvas) {
        if (!sourceCanvas) return null;
        if (landmarkCache.source !== sourceCanvas) {
            ensureLandmarks(sourceCanvas); // fires async; falls back to base meanwhile
            return null;
        }
        return compose(sourceCanvas);
    }

    window.PPGAttireStudio = {
        init, setSourceCanvas,
        setEnabled, isEnabled,
        setCountry, setDocument,
        setAttire, setAttireColor, clearAttire,
        setHijab, setHijabColor, clearHijab,
        setLayer, setEdgeSoftness, setTransform,
        restoreOriginal, getState,
        getOutputCanvas, recommend, runPhotoDoctor, runPhotoDoctorAsync
    };
})();
