/**
 * AI CAMERA STUDIO
 * -----------------
 * Privacy-first, fully client-side live camera capture with real-time
 * face-guided coaching, quality analysis and smart auto-crop.
 *
 * 🔒 Nothing here ever leaves the browser: no image, video frame, landmark
 * or biometric data is uploaded to any server. The optional face-detection
 * model is fetched once from a CDN (like any other script asset) and all
 * inference runs locally in the page.
 *
 * This module is intentionally self-contained: it builds its own UI,
 * and only talks to the host page through the small `PPGCameraStudio.open()`
 * API + the `onCapture(file, autoCrop)` callback supplied by the caller.
 * This keeps the existing upload / crop / adjust / A4 / PDF pipeline in
 * app.js and editor.js completely untouched.
 */
(function () {
    'use strict';

    const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
    const WASM_BASE = MEDIAPIPE_CDN + '/wasm';
    const FACE_LANDMARKER_MODEL =
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

    // Passport-style framing targets (fractions of frame), close to common
    // ICAO-style guidance: eyes around 55-65% up from the bottom, head
    // height ~ 70-80% of the frame height. These are *quality heuristics*,
    // not an official compliance guarantee. Three configurable strictness
    // tiers widen/narrow the tolerances used for coaching + scoring.
    const FRAMING_TIERS = {
        relaxed: {
            faceHeightMin: 0.40, faceHeightMax: 0.80, faceHeightIdeal: 0.60,
            eyeLineMin: 0.32, eyeLineMax: 0.52, centerToleranceX: 0.10,
            yawTolerance: 16, pitchTolerance: 14, rollTolerance: 11,
            eyeOpenMin: 0.45, expressionMax: 0.55, symmetryTolerance: 0.16
        },
        standard: {
            faceHeightMin: 0.45, faceHeightMax: 0.75, faceHeightIdeal: 0.60,
            eyeLineMin: 0.36, eyeLineMax: 0.48, centerToleranceX: 0.07,
            yawTolerance: 12, pitchTolerance: 10, rollTolerance: 8,
            eyeOpenMin: 0.55, expressionMax: 0.40, symmetryTolerance: 0.12
        },
        strict: {
            faceHeightMin: 0.48, faceHeightMax: 0.70, faceHeightIdeal: 0.58,
            eyeLineMin: 0.38, eyeLineMax: 0.46, centerToleranceX: 0.05,
            yawTolerance: 8, pitchTolerance: 7, rollTolerance: 5,
            eyeOpenMin: 0.65, expressionMax: 0.25, symmetryTolerance: 0.08
        }
    };
    let strictnessTier = 'standard';
    let FRAMING = FRAMING_TIERS[strictnessTier];

    const RESOLUTIONS = [
        { label: 'HD (1280×720)', width: 1280, height: 720 },
        { label: 'Full HD (1920×1080)', width: 1920, height: 1080 },
        { label: 'Standard (640×480)', width: 640, height: 480 }
    ];

    let injectedDom = false;
    let els = {};

    // Live state
    let stream = null;
    let facingMode = 'user';
    let resolutionIndex = 0;
    let faceLandmarker = null;
    let mediapipeStatus = 'idle'; // idle | loading | ready | unavailable
    let rafId = null;
    let vfcId = null; // requestVideoFrameCallback handle
    let lastAnalysisTime = 0;
    const ANALYSIS_INTERVAL_MS = 120; // throttle AI analysis for performance

    let stableSince = null;
    let autoCaptureEnabled = true;
    let autoCaptureSeconds = 5;
    let countdownTimer = null;
    let countdownValue = 0;
    let capturing = false;
    let lastResult = null; // last computed frame analysis (for auto-crop)
    let currentPreset = { widthMM: 35, heightMM: 45 };
    let onCaptureCallback = null;

    // Stability meter: tracks recent face-center/pose jitter to estimate
    // motion blur risk and drive the "Hold Still" coaching state.
    const STABILITY_WINDOW = 10;
    let stabilityHistory = [];
    let stabilityScore = 100;

    // Offloaded pixel-quality analysis (brightness/contrast/sharpness/
    // background uniformity/shadow) runs in a Web Worker using
    // OffscreenCanvas so the main thread stays free for smooth coaching.
    let qualityWorker = null;
    let workerSupported = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
    let workerBusy = false;
    let lastPixelSample = null; // most recent worker result (async, cached)
    let workerRequestId = 0;

    // AI Best-Frame burst capture state.
    let burstActive = false;
    let burstCandidates = [];

    function injectStyleOnce() {
        if (document.getElementById('ppg-camera-studio-style')) return;
        const link = document.createElement('link');
        link.id = 'ppg-camera-studio-style';
        link.rel = 'stylesheet';
        link.href = 'css/camera-studio.css';
        document.head.appendChild(link);
    }

    function buildDom() {
        if (injectedDom) return;
        injectedDom = true;

        const root = document.createElement('div');
        root.id = 'cameraStudio';
        root.className = 'camera-studio';
        root.setAttribute('aria-hidden', 'true');
        root.innerHTML = `
            <div class="camera-studio-inner">
                <div class="camera-studio-topbar">
                    <div class="camera-privacy-badge">🔒 Photo processed locally — never uploaded</div>
                    <button type="button" class="camera-close-btn" id="cameraCloseBtn" aria-label="Close camera">✕</button>
                </div>

                <div class="camera-stage">
                    <video id="cameraVideo" playsinline autoplay muted></video>
                    <canvas id="cameraOverlay"></canvas>

                    <div class="camera-coach" id="cameraCoach">
                        <span class="camera-coach-icon" id="cameraCoachIcon">🎥</span>
                        <span class="camera-coach-text" id="cameraCoachText">Starting camera…</span>
                    </div>

                    <div class="camera-countdown" id="cameraCountdown" hidden></div>

                    <div class="camera-stability" id="cameraStability" hidden>
                        <span class="camera-stability-label">Stability</span>
                        <div class="camera-stability-track"><div class="camera-stability-fill" id="cameraStabilityFill"></div></div>
                    </div>

                    <div class="camera-quality" id="cameraQuality" hidden>
                        <div class="camera-quality-score">
                            <span id="cameraQualityScore">--</span><small>/100</small>
                        </div>
                        <ul class="camera-quality-warnings" id="cameraQualityWarnings"></ul>
                    </div>
                </div>

                <div class="camera-controls">
                    <div class="camera-controls-row">
                        <label class="camera-control">
                            <span>Camera</span>
                            <select id="cameraFacingSelect">
                                <option value="user">Front</option>
                                <option value="environment">Rear</option>
                            </select>
                        </label>
                        <label class="camera-control">
                            <span>Resolution</span>
                            <select id="cameraResolutionSelect"></select>
                        </label>
                        <label class="camera-control camera-control-checkbox">
                            <input type="checkbox" id="cameraAutoCaptureToggle" checked />
                            <span>Smart Auto Capture</span>
                        </label>
                        <label class="camera-control">
                            <span>Countdown</span>
                            <select id="cameraCountdownSelect">
                                <option value="3">3s</option>
                                <option value="5" selected>5s</option>
                                <option value="10">10s</option>
                            </select>
                        </label>
                        <label class="camera-control">
                            <span>Guidance strictness</span>
                            <select id="cameraStrictnessSelect">
                                <option value="relaxed">Relaxed</option>
                                <option value="standard" selected>Standard</option>
                                <option value="strict">Strict (official)</option>
                            </select>
                        </label>
                    </div>

                    <div class="camera-actions">
                        <button type="button" class="btn-outline" id="cameraSwitchBtn">🔄 Switch Camera</button>
                        <button type="button" class="btn-primary camera-shutter" id="cameraShutterBtn">📸 Capture</button>
                        <button type="button" class="btn-outline" id="cameraBurstBtn">🤖 AI Best Shot (Burst)</button>
                    </div>

                    <div class="camera-review-actions" id="cameraReviewActions" hidden>
                        <button type="button" class="btn-outline" id="cameraRetakeBtn">↺ Retake</button>
                        <button type="button" class="btn-primary" id="cameraAcceptBtn">✓ Use This Photo</button>
                    </div>

                    <div class="camera-photo-doctor" id="cameraPhotoDoctor" hidden>
                        <div class="camera-photo-doctor-header">
                            <strong>🩺 AI Photo Doctor</strong>
                            <span class="camera-photo-doctor-score" id="cameraDoctorScore">--/100</span>
                        </div>
                        <ul class="camera-photo-doctor-list" id="cameraDoctorList"></ul>
                        <div class="camera-photo-doctor-fixes" id="cameraDoctorFixes"></div>
                    </div>

                    <p class="camera-error" id="cameraError" hidden></p>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        els = {
            root,
            video: document.getElementById('cameraVideo'),
            overlay: document.getElementById('cameraOverlay'),
            coach: document.getElementById('cameraCoach'),
            coachIcon: document.getElementById('cameraCoachIcon'),
            coachText: document.getElementById('cameraCoachText'),
            countdown: document.getElementById('cameraCountdown'),
            stability: document.getElementById('cameraStability'),
            stabilityFill: document.getElementById('cameraStabilityFill'),
            quality: document.getElementById('cameraQuality'),
            qualityScore: document.getElementById('cameraQualityScore'),
            qualityWarnings: document.getElementById('cameraQualityWarnings'),
            facingSelect: document.getElementById('cameraFacingSelect'),
            resolutionSelect: document.getElementById('cameraResolutionSelect'),
            autoCaptureToggle: document.getElementById('cameraAutoCaptureToggle'),
            countdownSelect: document.getElementById('cameraCountdownSelect'),
            strictnessSelect: document.getElementById('cameraStrictnessSelect'),
            switchBtn: document.getElementById('cameraSwitchBtn'),
            shutterBtn: document.getElementById('cameraShutterBtn'),
            burstBtn: document.getElementById('cameraBurstBtn'),
            reviewActions: document.getElementById('cameraReviewActions'),
            retakeBtn: document.getElementById('cameraRetakeBtn'),
            acceptBtn: document.getElementById('cameraAcceptBtn'),
            closeBtn: document.getElementById('cameraCloseBtn'),
            photoDoctor: document.getElementById('cameraPhotoDoctor'),
            doctorScore: document.getElementById('cameraDoctorScore'),
            doctorList: document.getElementById('cameraDoctorList'),
            doctorFixes: document.getElementById('cameraDoctorFixes'),
            error: document.getElementById('cameraError')
        };

        RESOLUTIONS.forEach((res, i) => {
            const opt = document.createElement('option');
            opt.value = String(i);
            opt.textContent = res.label;
            els.resolutionSelect.appendChild(opt);
        });
        els.resolutionSelect.value = String(resolutionIndex);

        wireControls();
    }

    function wireControls() {
        els.closeBtn.addEventListener('click', close);
        els.facingSelect.addEventListener('change', async (e) => {
            facingMode = e.target.value;
            await startStream();
        });
        els.resolutionSelect.addEventListener('change', async (e) => {
            resolutionIndex = parseInt(e.target.value, 10) || 0;
            await startStream();
        });
        els.autoCaptureToggle.addEventListener('change', (e) => {
            autoCaptureEnabled = e.target.checked;
            resetStability();
        });
        els.countdownSelect.addEventListener('change', (e) => {
            autoCaptureSeconds = parseInt(e.target.value, 10) || 5;
        });
        els.strictnessSelect.addEventListener('change', (e) => {
            strictnessTier = FRAMING_TIERS[e.target.value] ? e.target.value : 'standard';
            FRAMING = FRAMING_TIERS[strictnessTier];
        });
        els.switchBtn.addEventListener('click', async () => {
            facingMode = facingMode === 'user' ? 'environment' : 'user';
            els.facingSelect.value = facingMode;
            await startStream();
        });
        els.shutterBtn.addEventListener('click', () => manualCapture());
        els.burstBtn.addEventListener('click', () => startBurstCapture());
        els.retakeBtn.addEventListener('click', () => retake());
        els.acceptBtn.addEventListener('click', () => acceptCapture());
    }

    function showError(msg) {
        els.error.textContent = msg;
        els.error.hidden = false;
    }

    function clearError() {
        els.error.hidden = true;
        els.error.textContent = '';
    }

    // ---------------------------------------------------------------------
    // Camera lifecycle
    // ---------------------------------------------------------------------

    async function startStream() {
        stopStream();
        clearError();

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showError('Camera access (getUserMedia) is not supported in this browser.');
            return;
        }

        const res = RESOLUTIONS[resolutionIndex] || RESOLUTIONS[0];
        const constraints = {
            audio: false,
            video: {
                facingMode: facingMode,
                width: { ideal: res.width },
                height: { ideal: res.height }
            }
        };

        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            if (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
                showError('Camera permission denied. Please allow camera access to use Live Camera Studio.');
            } else if (err && err.name === 'NotFoundError') {
                showError('No camera device found on this device.');
            } else {
                showError('Unable to access the camera: ' + (err && err.message ? err.message : String(err)));
            }
            return;
        }

        els.video.srcObject = stream;
        await els.video.play().catch(() => {});

        els.video.addEventListener('loadedmetadata', () => {
            els.overlay.width = els.video.videoWidth;
            els.overlay.height = els.video.videoHeight;
        }, { once: true });

        resetStability();
        startAnalysisLoop();
    }

    function stopStream() {
        cancelAnalysisLoop();
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            stream = null;
        }
        if (els.video) {
            els.video.srcObject = null;
        }
    }

    // ---------------------------------------------------------------------
    // MediaPipe face landmarker (lazy, resilient to offline/blocked CDN)
    // ---------------------------------------------------------------------

    async function ensureFaceLandmarker() {
        if (faceLandmarker || mediapipeStatus === 'unavailable' || mediapipeStatus === 'loading') {
            return;
        }
        mediapipeStatus = 'loading';
        try {
            const visionModule = await import(/* webpackIgnore: true */ MEDIAPIPE_CDN + '/vision_bundle.mjs');
            const { FaceLandmarker, FilesetResolver } = visionModule;
            const filesetResolver = await FilesetResolver.forVisionTasks(WASM_BASE);
            faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: FACE_LANDMARKER_MODEL,
                    delegate: 'GPU'
                },
                // Blendshapes drive blink/eye-open, neutral-expression and
                // occlusion heuristics below.
                outputFaceBlendshapes: true,
                outputFacialTransformationMatrixes: true,
                runningMode: 'VIDEO',
                numFaces: 2
            });
            mediapipeStatus = 'ready';
        } catch (err) {
            console.warn('Camera Studio: face detection model unavailable (offline or blocked CDN). Falling back to manual capture only.', err);
            mediapipeStatus = 'unavailable';
            faceLandmarker = null;
        }
    }

    // ---------------------------------------------------------------------
    // Quality analysis Web Worker (OffscreenCanvas-based, throttled)
    // ---------------------------------------------------------------------

    function ensureQualityWorker() {
        if (!workerSupported || qualityWorker) return;
        try {
            qualityWorker = new Worker('js/qualityWorker.js');
            qualityWorker.onmessage = (event) => {
                workerBusy = false;
                const { result } = event.data || {};
                if (result) lastPixelSample = result;
            };
            qualityWorker.onerror = () => {
                workerBusy = false;
                workerSupported = false;
                qualityWorker = null;
            };
        } catch (err) {
            workerSupported = false;
            qualityWorker = null;
        }
    }

    function requestPixelSample() {
        if (!els.video || els.video.readyState < 2) return;
        if (!workerSupported) {
            lastPixelSample = sampleFrame(els.video, els.overlay.width, els.overlay.height);
            return;
        }
        ensureQualityWorker();
        if (!qualityWorker || workerBusy) return;
        workerBusy = true;
        const id = ++workerRequestId;
        createImageBitmap(els.video).then((bitmap) => {
            if (!qualityWorker) { bitmap.close(); workerBusy = false; return; }
            qualityWorker.postMessage({ id, bitmap, sampleW: 96, sampleH: 96 }, [bitmap]);
        }).catch(() => {
            workerBusy = false;
        });
    }

    function terminateQualityWorker() {
        if (qualityWorker) {
            qualityWorker.terminate();
            qualityWorker = null;
        }
        workerBusy = false;
    }

    // ---------------------------------------------------------------------
    // Analysis loop — prefers requestVideoFrameCallback (frame-accurate,
    // power efficient) and falls back to requestAnimationFrame.
    // ---------------------------------------------------------------------

    function startAnalysisLoop() {
        ensureFaceLandmarker();
        ensureQualityWorker();
        cancelAnalysisLoop();

        const tick = (timestamp) => {
            if (capturing) return;
            if (!els.video || els.video.readyState < 2) return;
            if (timestamp - lastAnalysisTime < ANALYSIS_INTERVAL_MS) return;
            lastAnalysisTime = timestamp;
            analyzeFrame(timestamp);
        };

        if (typeof els.video.requestVideoFrameCallback === 'function') {
            const loop = (now, metadata) => {
                vfcId = els.video.requestVideoFrameCallback(loop);
                tick(metadata && metadata.mediaTime ? metadata.mediaTime * 1000 : now);
            };
            vfcId = els.video.requestVideoFrameCallback(loop);
        } else {
            const loop = (timestamp) => {
                rafId = requestAnimationFrame(loop);
                tick(timestamp);
            };
            rafId = requestAnimationFrame(loop);
        }
    }

    function cancelAnalysisLoop() {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        if (vfcId && els.video && typeof els.video.cancelVideoFrameCallback === 'function') {
            els.video.cancelVideoFrameCallback(vfcId);
        }
        vfcId = null;
    }

    function analyzeFrame(timestamp) {
        const ctx = els.overlay.getContext('2d');
        const w = els.overlay.width;
        const h = els.overlay.height;
        if (!w || !h) return;
        ctx.clearRect(0, 0, w, h);

        drawPresetOverlay(ctx, w, h);
        requestPixelSample(); // async, throttled — result cached in lastPixelSample

        if (mediapipeStatus !== 'ready' || !faceLandmarker) {
            setCoach('info', mediapipeStatus === 'loading'
                ? 'Loading AI face guidance…'
                : 'AI guidance unavailable — position your face using the guides, then capture manually.');
            hideQuality();
            return;
        }

        let result;
        try {
            result = faceLandmarker.detectForVideo(els.video, timestamp);
        } catch (err) {
            return;
        }

        const faces = (result && result.faceLandmarks) || [];

        if (faces.length === 0) {
            lastResult = null;
            resetStability();
            hideQuality();
            setCoach('warn', '🙈 No face detected — center your face in the frame.');
            return;
        }
        if (faces.length > 1) {
            lastResult = null;
            resetStability();
            hideQuality();
            setCoach('warn', '👥 Multiple faces detected — only one person per photo.');
            return;
        }

        const landmarks = faces[0];
        const matrix = result.facialTransformationMatrixes && result.facialTransformationMatrixes[0];
        const blendshapes = (result.faceBlendshapes && result.faceBlendshapes[0] && result.faceBlendshapes[0].categories) || [];
        const analysis = computeFraming(landmarks, matrix, blendshapes, w, h);
        lastResult = { landmarks, matrix, blendshapes, analysis, w, h };

        updateStability(analysis);
        drawFaceOverlay(ctx, landmarks, analysis, w, h);
        applyCoaching(analysis);

        const quality = computeQuality(analysis, w, h);
        showQuality(quality);

        handleAutoCapture(analysis, quality);
    }

    // ---------------------------------------------------------------------
    // Stability meter — jitter of face center/pose over a short rolling
    // window, used to drive "Hold Still" coaching and motion-blur risk.
    // ---------------------------------------------------------------------

    function updateStability(analysis) {
        stabilityHistory.push({ x: analysis.centerOffsetX, y: analysis.eyeLineRatio, yaw: analysis.yaw, roll: analysis.roll });
        if (stabilityHistory.length > STABILITY_WINDOW) stabilityHistory.shift();
        if (stabilityHistory.length < 3) { stabilityScore = 100; return; }

        const mean = (arr, key) => arr.reduce((s, v) => s + v[key], 0) / arr.length;
        const variance = (arr, key, m) => arr.reduce((s, v) => s + (v[key] - m) ** 2, 0) / arr.length;

        const mx = mean(stabilityHistory, 'x');
        const my = mean(stabilityHistory, 'y');
        const myaw = mean(stabilityHistory, 'yaw');
        const jitter = Math.sqrt(variance(stabilityHistory, 'x', mx)) * 6
            + Math.sqrt(variance(stabilityHistory, 'y', my)) * 6
            + Math.sqrt(variance(stabilityHistory, 'yaw', myaw)) * 0.15;

        stabilityScore = Math.max(0, Math.min(100, Math.round(100 - jitter * 100)));
        if (els.stability) {
            els.stability.hidden = false;
            els.stabilityFill.style.width = stabilityScore + '%';
            els.stabilityFill.style.background = stabilityScore >= 75 ? '#4cd964' : stabilityScore >= 45 ? '#ffd60a' : '#ff3b30';
        }
    }

    function drawPresetOverlay(ctx, w, h) {
        const aspect = currentPreset.widthMM / currentPreset.heightMM;
        let boxH = h * 0.86;
        let boxW = boxH * aspect;
        if (boxW > w * 0.9) {
            boxW = w * 0.9;
            boxH = boxW / aspect;
        }
        const x = (w - boxW) / 2;
        const y = (h - boxH) / 2;

        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.strokeRect(x, y, boxW, boxH);

        // Center vertical line
        ctx.beginPath();
        ctx.moveTo(w / 2, y);
        ctx.lineTo(w / 2, y + boxH);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.setLineDash([4, 6]);
        ctx.stroke();

        // Eye line guide (target zone)
        const eyeMinY = y + boxH * (1 - FRAMING.eyeLineMax);
        const eyeMaxY = y + boxH * (1 - FRAMING.eyeLineMin);
        ctx.strokeStyle = 'rgba(76, 217, 100, 0.7)';
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(x, (eyeMinY + eyeMaxY) / 2);
        ctx.lineTo(x + boxW, (eyeMinY + eyeMaxY) / 2);
        ctx.stroke();
        ctx.restore();
    }

    function blendshapeScore(blendshapes, name) {
        const cat = blendshapes.find((c) => c.categoryName === name);
        return cat ? cat.score : 0;
    }

    function computeFraming(landmarks, matrix, blendshapes, w, h) {
        // Bounding box from all landmarks (normalized 0..1 coords from MediaPipe)
        let minX = 1, maxX = 0, minY = 1, maxY = 0;
        for (const p of landmarks) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        const faceW = (maxX - minX) * w;
        const faceH = (maxY - minY) * h;
        const centerX = ((minX + maxX) / 2) * w;
        const centerY = ((minY + maxY) / 2) * h;

        // Approximate eye positions (MediaPipe FaceMesh indices for eye centers)
        const leftEye = landmarks[468] || landmarks[33];
        const rightEye = landmarks[473] || landmarks[263];
        const eyeY = leftEye && rightEye ? ((leftEye.y + rightEye.y) / 2) * h : centerY;

        let yaw = 0, pitch = 0, roll = 0;
        if (matrix && matrix.data && matrix.data.length >= 16) {
            const m = matrix.data;
            // Rotation part of the 4x4 column-major transformation matrix
            const r00 = m[0], r10 = m[1], r20 = m[2];
            const r21 = m[6], r22 = m[10];
            const r01 = m[4];
            yaw = Math.atan2(-r20, Math.sqrt(r21 * r21 + r22 * r22)) * (180 / Math.PI);
            pitch = Math.atan2(r21, r22) * (180 / Math.PI);
            roll = Math.atan2(r10, r00) * (180 / Math.PI);
            void r01;
        }

        // Blink / eye-open (blendshapes 0 = open, 1 = fully closed).
        const blinkLeft = blendshapeScore(blendshapes, 'eyeBlinkLeft');
        const blinkRight = blendshapeScore(blendshapes, 'eyeBlinkRight');
        const eyeOpenness = 1 - (blinkLeft + blinkRight) / 2;

        // Neutral expression: highest of smile/frown intensity.
        const smile = Math.max(blendshapeScore(blendshapes, 'mouthSmileLeft'), blendshapeScore(blendshapes, 'mouthSmileRight'));
        const frown = Math.max(blendshapeScore(blendshapes, 'mouthFrownLeft'), blendshapeScore(blendshapes, 'mouthFrownRight'));
        const jawOpen = blendshapeScore(blendshapes, 'jawOpen');
        const expressionScore = Math.max(smile, frown, jawOpen * 0.6);

        // Facial symmetry: compare left/right eye-to-nose-tip distances and
        // mouth-corner heights, normalized by face width/height.
        const noseTip = landmarks[1] || { x: centerX / w, y: centerY / h };
        const leftEyeOuter = landmarks[33];
        const rightEyeOuter = landmarks[263];
        const mouthLeft = landmarks[61];
        const mouthRight = landmarks[291];
        let symmetry = 1;
        if (leftEyeOuter && rightEyeOuter && faceW > 0) {
            const dL = Math.abs(leftEyeOuter.x - noseTip.x) * w;
            const dR = Math.abs(rightEyeOuter.x - noseTip.x) * w;
            const eyeAsymmetry = Math.abs(dL - dR) / faceW;
            let mouthAsymmetry = 0;
            if (mouthLeft && mouthRight) {
                mouthAsymmetry = Math.abs(mouthLeft.y - mouthRight.y) * h / Math.max(1, faceH);
            }
            symmetry = Math.max(0, 1 - (eyeAsymmetry * 2 + mouthAsymmetry * 2));
        }

        // Occlusion heuristic: eyes stuck at a constant partial-open value
        // regardless of blink activity often indicates sunglasses/covering,
        // and a face detected without any blendshape data suggests a
        // partially blocked/low-confidence read.
        const occlusionSuspected = blendshapes.length === 0 || (eyeOpenness > 0.15 && eyeOpenness < 0.85 &&
            Math.abs(blinkLeft - blinkRight) < 0.03 && blinkLeft > 0.1 && blinkLeft < 0.9);

        return {
            boxX: minX * w, boxY: minY * h, boxW: faceW, boxH: faceH,
            centerX, centerY, eyeY,
            faceHeightRatio: faceH / h,
            centerOffsetX: (centerX - w / 2) / w,
            eyeLineRatio: 1 - (eyeY / h),
            yaw, pitch, roll,
            eyeOpenness, expressionScore, symmetry, occlusionSuspected
        };
    }

    function drawFaceOverlay(ctx, landmarks, analysis, w, h) {
        ctx.save();
        ctx.strokeStyle = '#4cd964';
        ctx.lineWidth = 2;
        ctx.strokeRect(analysis.boxX, analysis.boxY, analysis.boxW, analysis.boxH);

        ctx.beginPath();
        ctx.arc(analysis.centerX, analysis.centerY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#4cd964';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(analysis.boxX, analysis.eyeY);
        ctx.lineTo(analysis.boxX + analysis.boxW, analysis.eyeY);
        ctx.strokeStyle = '#ffd60a';
        ctx.setLineDash([]);
        ctx.stroke();
        ctx.restore();
    }

    function withinFraming(analysis) {
        const issues = [];
        if (analysis.faceHeightRatio < FRAMING.faceHeightMin) issues.push('closer');
        if (analysis.faceHeightRatio > FRAMING.faceHeightMax) issues.push('farther');
        if (analysis.centerOffsetX > FRAMING.centerToleranceX) issues.push('left');
        if (analysis.centerOffsetX < -FRAMING.centerToleranceX) issues.push('right');
        if (analysis.eyeLineRatio < FRAMING.eyeLineMin) issues.push('up');
        if (analysis.eyeLineRatio > FRAMING.eyeLineMax) issues.push('down');
        if (Math.abs(analysis.yaw) > FRAMING.yawTolerance || Math.abs(analysis.roll) > FRAMING.rollTolerance) issues.push('straighten');
        if (Math.abs(analysis.pitch) > FRAMING.pitchTolerance) issues.push('look');
        if (analysis.eyeOpenness < FRAMING.eyeOpenMin) issues.push('blink');
        if (analysis.expressionScore > FRAMING.expressionMax) issues.push('expression');
        if (stabilityScore < 55) issues.push('hold');
        return issues;
    }

    function applyCoaching(analysis) {
        const issues = withinFraming(analysis);

        if (issues.length === 0) {
            setCoach('ready', '✅ Perfect! Hold still…');
            return;
        }

        const messages = {
            closer: '↔️ Move closer to the camera',
            farther: '↔️ Move a bit farther away',
            left: '⬅️ Move left',
            right: '➡️ Move right',
            up: '⬆️ Move up',
            down: '⬇️ Move down',
            straighten: '↕️ Straighten your head',
            look: '👀 Look straight at the camera',
            blink: '😳 Open your eyes fully',
            expression: '😐 Relax to a neutral expression',
            hold: '🧍 Hold still…'
        };

        setCoach('warn', messages[issues[0]] || 'Adjust your position');
    }

    function setCoach(state, text) {
        els.coach.classList.remove('coach-ready', 'coach-warn', 'coach-info');
        els.coach.classList.add('coach-' + state);
        els.coachText.textContent = text;
        els.coachIcon.textContent = state === 'ready' ? '🟢' : state === 'warn' ? '🟡' : 'ℹ️';
    }

    // ---------------------------------------------------------------------
    // Quality scoring — produces both an overall score and a per-category
    // breakdown consumed by the AI Photo Doctor panel.
    // ---------------------------------------------------------------------

    function computeQuality(analysis, w, h) {
        const warnings = [];
        const categories = {};

        // Resolution
        categories.resolution = (w >= 720 && h >= 720) ? 100 : (w >= 480 && h >= 480) ? 75 : 45;
        if (categories.resolution < 100) warnings.push('Low camera resolution — choose a higher setting if available.');

        const sample = lastPixelSample;
        if (sample) {
            let lighting = 100;
            if (sample.brightness < 80) { lighting -= 45; warnings.push('Image is too dark — add more light.'); }
            if (sample.brightness > 200) { lighting -= 45; warnings.push('Image is overexposed — reduce lighting/backlight.'); }
            if (sample.contrast < 20) { lighting -= 25; warnings.push('Low contrast — improve lighting evenness.'); }
            if (sample.shadowAsymmetry > 0.08) { lighting -= 20; warnings.push('Uneven shadow detected — use symmetric front lighting.'); }
            categories.lighting = Math.max(0, lighting);

            categories.sharpness = Math.max(0, Math.min(100, Math.round((sample.sharpness / 20) * 100)));
            if (sample.sharpness < 8) warnings.push('Image looks blurry/motion-blurred — hold still and check focus.');

            let background = Math.round(sample.backgroundUniformity * 100);
            if (sample.backgroundUniformity < 0.6) warnings.push('Background isn\'t uniform — use a plain wall/backdrop.');
            categories.background = Math.max(0, Math.min(100, background));
        } else {
            categories.lighting = 70;
            categories.sharpness = 70;
            categories.background = 70;
        }

        if (analysis) {
            categories.faceSize = (analysis.faceHeightRatio >= FRAMING.faceHeightMin && analysis.faceHeightRatio <= FRAMING.faceHeightMax) ? 100 : 55;
            if (categories.faceSize < 100) warnings.push('Face size is outside the recommended range.');

            categories.facePosition = (Math.abs(analysis.centerOffsetX) <= FRAMING.centerToleranceX &&
                analysis.eyeLineRatio >= FRAMING.eyeLineMin && analysis.eyeLineRatio <= FRAMING.eyeLineMax) ? 100 : 55;
            if (categories.facePosition < 100) warnings.push('Face is not centered/framed correctly.');

            const poseOk = Math.abs(analysis.yaw) <= FRAMING.yawTolerance &&
                Math.abs(analysis.pitch) <= FRAMING.pitchTolerance &&
                Math.abs(analysis.roll) <= FRAMING.rollTolerance;
            categories.pose = poseOk ? 100 : 50;
            if (!poseOk) warnings.push('Head pose is tilted/turned — face the camera directly.');

            let eyes = 100;
            if (analysis.eyeOpenness < FRAMING.eyeOpenMin) { eyes -= 50; warnings.push('Eyes appear closed/partially closed.'); }
            if (analysis.occlusionSuspected) { eyes -= 25; warnings.push('Possible eye/face occlusion (glasses glare, hair or hand) detected.'); }
            if (analysis.expressionScore > FRAMING.expressionMax) { eyes -= 15; warnings.push('Non-neutral expression detected (smiling/frowning).'); }
            categories.eyes = Math.max(0, eyes);

            categories.framing = Math.round((categories.faceSize + categories.facePosition) / 2);

            if (analysis.symmetry < 1 - FRAMING.symmetryTolerance) {
                warnings.push('Facial symmetry looks off — check for tilted head or uneven lighting.');
            }
        } else {
            categories.faceSize = 0; categories.facePosition = 0; categories.pose = 0;
            categories.eyes = 0; categories.framing = 0;
            warnings.push('No face detected in frame.');
        }

        const weights = { facePosition: 0.16, faceSize: 0.12, pose: 0.14, eyes: 0.14, sharpness: 0.14, lighting: 0.12, background: 0.1, resolution: 0.04, framing: 0.04 };
        let score = 0, weightSum = 0;
        Object.keys(weights).forEach((k) => {
            if (categories[k] !== undefined) { score += categories[k] * weights[k]; weightSum += weights[k]; }
        });
        score = weightSum > 0 ? Math.round(score / weightSum) : 0;

        return { score, warnings, categories };
    }

    function sampleFrame(video, w, h) {
        // Main-thread fallback used only when Web Workers/OffscreenCanvas
        // are unsupported by the browser.
        if (!video || !video.videoWidth) return null;
        const sampleW = 96, sampleH = Math.round(96 * (h / w)) || 96;
        if (!qualityCanvas) {
            qualityCanvas = document.createElement('canvas');
        }
        qualityCanvas.width = sampleW;
        qualityCanvas.height = sampleH;
        const ctx = qualityCanvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, sampleW, sampleH);
        let data;
        try {
            data = ctx.getImageData(0, 0, sampleW, sampleH).data;
        } catch (err) {
            return null;
        }

        let sum = 0;
        let sumSq = 0;
        const gray = new Float32Array(sampleW * sampleH);
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

        // Simple Laplacian-based sharpness estimate
        let lapSum = 0;
        let lapCount = 0;
        for (let y = 1; y < sampleH - 1; y++) {
            for (let x = 1; x < sampleW - 1; x++) {
                const idx = y * sampleW + x;
                const lap = (
                    gray[idx - 1] + gray[idx + 1] + gray[idx - sampleW] + gray[idx + sampleW] - 4 * gray[idx]
                );
                lapSum += lap * lap;
                lapCount++;
            }
        }
        const sharpness = Math.sqrt(lapSum / Math.max(1, lapCount)) / 10;

        // Background uniformity + shadow: sample border pixels, split left/right.
        let borderSum = 0, borderSumSq = 0, borderN = 0;
        let leftSum = 0, leftN = 0, rightSum = 0, rightN = 0;
        const border = 4;
        for (let y = 0; y < sampleH; y++) {
            for (let x = 0; x < sampleW; x++) {
                if (x < border || x >= sampleW - border || y < border || y >= sampleH - border) {
                    const idx = y * sampleW + x;
                    borderSum += gray[idx];
                    borderSumSq += gray[idx] * gray[idx];
                    borderN++;
                    if (x < sampleW / 2) { leftSum += gray[idx]; leftN++; } else { rightSum += gray[idx]; rightN++; }
                }
            }
        }
        const borderMean = borderSum / Math.max(1, borderN);
        const borderVar = borderSumSq / Math.max(1, borderN) - borderMean * borderMean;
        const borderStd = Math.sqrt(Math.max(0, borderVar));
        const backgroundUniformity = Math.max(0, 1 - borderStd / 60);
        const shadowAsymmetry = Math.abs((leftSum / Math.max(1, leftN)) - (rightSum / Math.max(1, rightN))) / 255;

        return { brightness, contrast, sharpness, backgroundUniformity, shadowAsymmetry, borderMean };
    }
    let qualityCanvas = null;

    function showQuality(quality) {
        els.quality.hidden = false;
        els.qualityScore.textContent = String(quality.score);
        els.quality.classList.toggle('quality-good', quality.score >= 80);
        els.quality.classList.toggle('quality-warn', quality.score >= 50 && quality.score < 80);
        els.quality.classList.toggle('quality-bad', quality.score < 50);
        els.qualityWarnings.innerHTML = quality.warnings.slice(0, 3).map((w) => `<li>${w}</li>`).join('');
    }

    function hideQuality() {
        els.quality.hidden = true;
    }

    // ---------------------------------------------------------------------
    // Smart auto-capture
    // ---------------------------------------------------------------------

    function resetStability() {
        stableSince = null;
        stabilityHistory = [];
        stabilityScore = 100;
        if (els.stability) els.stability.hidden = true;
        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
        countdownValue = 0;
        els.countdown.hidden = true;
    }

    function handleAutoCapture(analysis, quality) {
        if (!autoCaptureEnabled || capturing) return;
        const issues = withinFraming(analysis);
        const ready = issues.length === 0 && quality.score >= 60;

        if (!ready) {
            resetStability();
            return;
        }

        if (!stableSince) {
            stableSince = performance.now();
        }

        const stableFor = performance.now() - stableSince;
        if (stableFor > 500 && !countdownTimer) {
            startCountdown(autoCaptureSeconds);
        }
    }

    function startCountdown(seconds) {
        countdownValue = seconds;
        els.countdown.hidden = false;
        els.countdown.textContent = String(countdownValue);
        countdownTimer = setInterval(() => {
            countdownValue--;
            if (countdownValue <= 0) {
                clearInterval(countdownTimer);
                countdownTimer = null;
                els.countdown.hidden = true;
                doCapture();
            } else {
                els.countdown.textContent = String(countdownValue);
            }
        }, 1000);
    }

    function manualCapture() {
        resetStability();
        doCapture();
    }

    // ---------------------------------------------------------------------
    // Capture / review / accept
    // ---------------------------------------------------------------------

    let capturedBlobUrl = null;

    function doCapture() {
        if (capturing) return;
        capturing = true;
        cancelAnalysisLoop();

        const w = els.video.videoWidth;
        const h = els.video.videoHeight;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(els.video, 0, 0, w, h);

        const snapshotResult = lastResult;
        const snapshotQuality = snapshotResult ? computeQuality(snapshotResult.analysis, w, h) : computeQuality(null, w, h);

        canvas.toBlob((blob) => {
            capturedBlobUrl = URL.createObjectURL(blob);
            els.video.pause();
            els.video.style.opacity = '0';
            els.overlay.style.opacity = '0';
            els.overlay.getContext('2d').clearRect(0, 0, els.overlay.width, els.overlay.height);

            // Show still frame behind controls using a simple <img> overlay
            let stillImg = document.getElementById('cameraStillPreview');
            if (!stillImg) {
                stillImg = document.createElement('img');
                stillImg.id = 'cameraStillPreview';
                stillImg.className = 'camera-still-preview';
                els.video.parentElement.appendChild(stillImg);
            }
            stillImg.src = capturedBlobUrl;
            stillImg.style.display = 'block';

            els.reviewActions.hidden = false;
            els.coach.hidden = true;
            hideQuality();

            if (snapshotResult && snapshotResult.landmarks) {
                finalizeAutoCrop(canvas, snapshotResult);
            } else {
                pendingAutoCropRect = null;
            }

            pendingCapture = { blob, canvas };
            showPhotoDoctor(snapshotQuality);
        }, 'image/jpeg', 0.95);
    }

    // ---------------------------------------------------------------------
    // AI Best-Frame burst capture: samples several frames over ~1.6s,
    // scores each with the same quality/analysis pipeline used live, and
    // keeps the highest-scoring one automatically.
    // ---------------------------------------------------------------------

    function startBurstCapture() {
        if (capturing || burstActive) return;
        burstActive = true;
        burstCandidates = [];
        resetStability();
        els.burstBtn.disabled = true;
        els.shutterBtn.disabled = true;
        const BURST_COUNT = 8;
        const BURST_INTERVAL_MS = 200;
        let taken = 0;

        setCoach('info', '🤖 Capturing burst — hold your best pose…');

        const grabOne = () => {
            if (!els.video || els.video.readyState < 2) { finishBurst(); return; }
            const w = els.video.videoWidth;
            const h = els.video.videoHeight;
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(els.video, 0, 0, w, h);
            const analysis = lastResult ? lastResult.analysis : null;
            const quality = computeQuality(analysis, w, h);
            const stability = stabilityScore;
            const overall = quality.score * 0.7 + stability * 0.3;
            burstCandidates.push({ canvas, quality, overall, hasFace: !!analysis });

            taken++;
            if (taken >= BURST_COUNT) {
                finishBurst();
            } else {
                setTimeout(grabOne, BURST_INTERVAL_MS);
            }
        };

        const finishBurst = () => {
            burstActive = false;
            els.burstBtn.disabled = false;
            els.shutterBtn.disabled = false;
            if (burstCandidates.length === 0) { setCoach('warn', 'Burst capture failed — try again.'); return; }

            const withFaces = burstCandidates.filter((c) => c.hasFace);
            const pool = withFaces.length > 0 ? withFaces : burstCandidates;
            const best = pool.reduce((a, b) => (b.overall > a.overall ? b : a));

            capturing = true;
            cancelAnalysisLoop();
            best.canvas.toBlob((blob) => {
                capturedBlobUrl = URL.createObjectURL(blob);
                els.video.pause();
                els.video.style.opacity = '0';
                els.overlay.style.opacity = '0';
                els.overlay.getContext('2d').clearRect(0, 0, els.overlay.width, els.overlay.height);

                let stillImg = document.getElementById('cameraStillPreview');
                if (!stillImg) {
                    stillImg = document.createElement('img');
                    stillImg.id = 'cameraStillPreview';
                    stillImg.className = 'camera-still-preview';
                    els.video.parentElement.appendChild(stillImg);
                }
                stillImg.src = capturedBlobUrl;
                stillImg.style.display = 'block';

                els.reviewActions.hidden = false;
                els.coach.hidden = true;
                hideQuality();

                if (lastResult && lastResult.landmarks) {
                    finalizeAutoCrop(best.canvas, lastResult);
                } else {
                    pendingAutoCropRect = null;
                }

                pendingCapture = { blob, canvas: best.canvas };
                showPhotoDoctor(best.quality, burstCandidates.length);
            }, 'image/jpeg', 0.95);
        };

        grabOne();
    }

    let pendingCapture = null;
    let pendingAutoCropRect = null;

    function finalizeAutoCrop(canvas, result) {
        // Map normalized landmark bbox to the captured still's pixel space and
        // build a crop rectangle matching the selected preset aspect ratio,
        // centered on the face with the eye-line positioned at the ideal zone.
        const aspect = currentPreset.widthMM / currentPreset.heightMM;
        const boxH = result.analysis.boxH;
        const centerX = result.analysis.centerX;
        const idealFaceHeightRatio = FRAMING.faceHeightIdeal;

        const cropHeight = Math.min(canvas.height, boxH / idealFaceHeightRatio);
        const cropWidth = Math.min(canvas.width, cropHeight * aspect);
        const finalCropHeight = cropWidth / aspect <= canvas.height ? cropWidth / aspect : canvas.height;
        const finalCropWidth = finalCropHeight * aspect;

        // Target eye-line ratio (from the top of the crop) matches the ideal
        // zone used for live coaching, i.e. eyeLineRatio (from bottom) ~ 0.42
        // => eyes sit at ~58% down from the top of the cropped photo.
        const idealEyeLineFromTop = 1 - (FRAMING.eyeLineMin + FRAMING.eyeLineMax) / 2;

        let x = centerX - finalCropWidth / 2;
        let y = result.analysis.eyeY - finalCropHeight * idealEyeLineFromTop;

        x = Math.max(0, Math.min(canvas.width - finalCropWidth, x));
        y = Math.max(0, Math.min(canvas.height - finalCropHeight, y));

        pendingAutoCropRect = { x, y, width: finalCropWidth, height: finalCropHeight };
    }

    function retake() {
        capturing = false;
        pendingCapture = null;
        pendingAutoCropRect = null;
        const stillImg = document.getElementById('cameraStillPreview');
        if (stillImg) stillImg.style.display = 'none';
        if (capturedBlobUrl) {
            URL.revokeObjectURL(capturedBlobUrl);
            capturedBlobUrl = null;
        }
        els.video.style.opacity = '1';
        els.overlay.style.opacity = '1';
        els.video.play().catch(() => {});
        els.reviewActions.hidden = true;
        els.coach.hidden = false;
        hidePhotoDoctor();
        resetStability();
        startAnalysisLoop();
    }

    function acceptCapture() {
        if (!pendingCapture) return;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([pendingCapture.blob], `camera-capture-${timestamp}.jpg`, { type: 'image/jpeg' });
        const autoCrop = pendingAutoCropRect;
        const callback = onCaptureCallback;
        close();
        if (typeof callback === 'function') {
            callback(file, autoCrop);
        }
    }

    // ---------------------------------------------------------------------
    // AI Photo Doctor — 0-100 category breakdown with "Fix Automatically"
    // actions for issues that can be safely auto-corrected without
    // distorting or permanently altering the original capture.
    // ---------------------------------------------------------------------

    const CATEGORY_LABELS = {
        facePosition: 'Face position', faceSize: 'Face size', pose: 'Head pose', eyes: 'Eyes',
        sharpness: 'Sharpness', lighting: 'Lighting', background: 'Background', resolution: 'Resolution', framing: 'Framing'
    };

    function showPhotoDoctor(quality, burstSampleCount) {
        if (!els.photoDoctor) return;
        els.photoDoctor.hidden = false;
        els.doctorScore.textContent = quality.score + '/100';
        els.doctorScore.className = 'camera-photo-doctor-score ' +
            (quality.score >= 80 ? 'score-good' : quality.score >= 50 ? 'score-warn' : 'score-bad');

        const rows = Object.keys(CATEGORY_LABELS).map((key) => {
            const value = quality.categories[key];
            if (value === undefined) return '';
            const cls = value >= 80 ? 'good' : value >= 50 ? 'warn' : 'bad';
            return `<li class="doctor-${cls}"><span>${CATEGORY_LABELS[key]}</span><strong>${value}</strong></li>`;
        }).join('');
        const burstNote = burstSampleCount ? `<li class="doctor-info"><span>AI Best Shot</span><strong>1 of ${burstSampleCount}</strong></li>` : '';
        els.doctorList.innerHTML = burstNote + rows;

        const fixes = [];
        if ((quality.categories.background || 100) < 80) {
            fixes.push({ id: 'bg', label: '🩹 Fix background (white)' });
        }
        if ((quality.categories.lighting || 100) < 70) {
            fixes.push({ id: 'light', label: '🩹 Fix brightness/contrast' });
        }
        if ((quality.categories.facePosition || 100) < 80 || (quality.categories.faceSize || 100) < 80) {
            fixes.push({ id: 'crop', label: '🩹 Re-center & re-crop' });
        }

        els.doctorFixes.innerHTML = '';
        fixes.forEach((fix) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-outline camera-fix-btn';
            btn.textContent = fix.label;
            btn.addEventListener('click', () => applyAutoFix(fix.id, quality));
            els.doctorFixes.appendChild(btn);
        });
    }

    function hidePhotoDoctor() {
        if (els.photoDoctor) els.photoDoctor.hidden = true;
    }

    async function applyAutoFix(fixId, quality) {
        if (!pendingCapture) return;
        const canvas = pendingCapture.canvas;

        if (fixId === 'crop' && lastResult && lastResult.landmarks) {
            finalizeAutoCrop(canvas, lastResult);
        }

        if (fixId === 'light') {
            const fixed = document.createElement('canvas');
            fixed.width = canvas.width;
            fixed.height = canvas.height;
            const fctx = fixed.getContext('2d');
            const sample = lastPixelSample;
            const brightnessAdjust = sample && sample.brightness < 80 ? 1.15 : sample && sample.brightness > 200 ? 0.9 : 1;
            fctx.filter = `brightness(${brightnessAdjust}) contrast(1.08) saturate(1.02)`;
            fctx.drawImage(canvas, 0, 0);
            fctx.filter = 'none';
            pendingCapture.canvas = fixed;
        }

        if (fixId === 'bg' && window.PPGBackgroundRemoval) {
            const removed = await window.PPGBackgroundRemoval.removeBackground(canvas);
            if (removed) {
                const composed = document.createElement('canvas');
                composed.width = canvas.width;
                composed.height = canvas.height;
                const cctx = composed.getContext('2d');
                cctx.fillStyle = '#ffffff';
                cctx.fillRect(0, 0, composed.width, composed.height);
                cctx.drawImage(removed, 0, 0);
                pendingCapture.canvas = composed;
            }
        }

        pendingCapture.canvas.toBlob((blob) => {
            pendingCapture.blob = blob;
            capturedBlobUrl && URL.revokeObjectURL(capturedBlobUrl);
            capturedBlobUrl = URL.createObjectURL(blob);
            const stillImg = document.getElementById('cameraStillPreview');
            if (stillImg) stillImg.src = capturedBlobUrl;
        }, 'image/jpeg', 0.95);
    }

    // ---------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------

    async function open(options) {
        options = options || {};
        onCaptureCallback = options.onCapture || null;
        currentPreset = options.preset || { widthMM: 35, heightMM: 45 };

        injectStyleOnce();
        buildDom();

        capturing = false;
        pendingCapture = null;
        pendingAutoCropRect = null;
        els.reviewActions.hidden = true;
        els.coach.hidden = false;
        hidePhotoDoctor();
        clearError();
        const stillImg = document.getElementById('cameraStillPreview');
        if (stillImg) stillImg.style.display = 'none';
        els.video.style.opacity = '1';
        els.overlay.style.opacity = '1';

        els.root.classList.add('open');
        els.root.setAttribute('aria-hidden', 'false');
        document.body.classList.add('camera-studio-active');

        await startStream();
    }

    function close() {
        stopStream();
        terminateQualityWorker();
        resetStability();
        burstActive = false;
        burstCandidates = [];
        lastPixelSample = null;
        lastResult = null;
        if (capturedBlobUrl) {
            URL.revokeObjectURL(capturedBlobUrl);
            capturedBlobUrl = null;
        }
        if (els.root) {
            els.root.classList.remove('open');
            els.root.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('camera-studio-active');
        capturing = false;
        onCaptureCallback = null;
    }

    window.PPGCameraStudio = { open, close };
})();
