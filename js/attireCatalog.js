/**
 * PROFESSIONAL ATTIRE CATALOG
 * ---------------------------
 * Procedural (vector/canvas-drawn) clothing & hijab definitions. No raster
 * clothing images are shipped — every item is rendered on-device as layered
 * canvas shapes so it can be recoloured, rescaled and aligned to any face
 * without needing large binary asset downloads (keeping the app offline/PWA
 * friendly and privacy-first).
 *
 * `shape` selects the procedural renderer used by attireStudio.js:
 *   shirt | blazer | suit | coat | tie | bowtie | hijab
 */
(function () {
    'use strict';

    const COLOR_PRESETS = {
        shirt: [
            { name: 'White', value: '#f7f8fa' },
            { name: 'Light Blue', value: '#a9c9e8' },
            { name: 'Blue', value: '#3b6ea5' },
            { name: 'Black', value: '#2b2d31' },
            { name: 'Gray', value: '#7a7f87' }
        ],
        blazerSuit: [
            { name: 'Navy', value: '#1f2a44' },
            { name: 'Black', value: '#1c1c1e' },
            { name: 'Gray', value: '#54565c' },
            { name: 'Charcoal', value: '#33363d' },
            { name: 'Brown', value: '#4a372b' }
        ],
        tie: [
            { name: 'Navy', value: '#1f2a44' },
            { name: 'Maroon', value: '#6b1f2a' },
            { name: 'Black', value: '#1c1c1e' },
            { name: 'Burgundy', value: '#5a1f30' },
            { name: 'Silver', value: '#9aa0a6' }
        ],
        hijab: [
            { name: 'Black', value: '#1c1c1e' },
            { name: 'White', value: '#f5f5f2' },
            { name: 'Navy', value: '#1f2a44' },
            { name: 'Gray', value: '#6b6e75' },
            { name: 'Beige', value: '#cdbba0' },
            { name: 'Cream', value: '#efe6d3' },
            { name: 'Dark Blue', value: '#152238' }
        ]
    };

    // category: shirt | blazer | suit | jacket | coat | tie | hijab
    const INDIA_ATTIRE = [
        { id: 'in-shirt-white', category: 'shirt', shape: 'shirt', label: 'White Formal Shirt', colors: COLOR_PRESETS.shirt, defaultColor: '#f7f8fa' },
        { id: 'in-shirt-lightblue', category: 'shirt', shape: 'shirt', label: 'Light-Blue Shirt', colors: COLOR_PRESETS.shirt, defaultColor: '#a9c9e8' },
        { id: 'in-shirt-blue', category: 'shirt', shape: 'shirt', label: 'Blue Shirt', colors: COLOR_PRESETS.shirt, defaultColor: '#3b6ea5' },
        { id: 'in-shirt-dark', category: 'shirt', shape: 'shirt', label: 'Black/Gray Formal Shirt', colors: COLOR_PRESETS.shirt, defaultColor: '#2b2d31' },
        { id: 'in-blazer-formal', category: 'blazer', shape: 'blazer', label: 'Formal Blazer', colors: COLOR_PRESETS.blazerSuit, defaultColor: '#1f2a44' },
        { id: 'in-blazer-black', category: 'blazer', shape: 'blazer', label: 'Black Blazer', colors: COLOR_PRESETS.blazerSuit, defaultColor: '#1c1c1e' },
        { id: 'in-blazer-navy', category: 'blazer', shape: 'blazer', label: 'Navy Blazer', colors: COLOR_PRESETS.blazerSuit, defaultColor: '#1f2a44' },
        { id: 'in-blazer-gray', category: 'blazer', shape: 'blazer', label: 'Gray Blazer', colors: COLOR_PRESETS.blazerSuit, defaultColor: '#54565c' },
        { id: 'in-suit-formal', category: 'suit', shape: 'suit', label: 'Formal Suit', colors: COLOR_PRESETS.blazerSuit, defaultColor: '#1f2a44' },
        { id: 'in-coat', category: 'coat', shape: 'coat', label: 'Coat', colors: COLOR_PRESETS.blazerSuit, defaultColor: '#33363d' },
        { id: 'in-tie', category: 'tie', shape: 'tie', label: 'Tie', colors: COLOR_PRESETS.tie, defaultColor: '#1f2a44' },
        { id: 'in-bowtie', category: 'tie', shape: 'bowtie', label: 'Bow Tie', colors: COLOR_PRESETS.tie, defaultColor: '#1c1c1e' }
    ];

    const USA_ATTIRE = [
        { id: 'us-shirt-white', category: 'shirt', shape: 'shirt', label: 'White Shirt', colors: COLOR_PRESETS.shirt, defaultColor: '#f7f8fa' },
        { id: 'us-shirt-lightblue', category: 'shirt', shape: 'shirt', label: 'Light-Blue Shirt', colors: COLOR_PRESETS.shirt, defaultColor: '#a9c9e8' },
        { id: 'us-shirt-blue', category: 'shirt', shape: 'shirt', label: 'Blue Shirt', colors: COLOR_PRESETS.shirt, defaultColor: '#3b6ea5' },
        { id: 'us-blouse', category: 'shirt', shape: 'blouse', label: 'Formal Blouse', colors: COLOR_PRESETS.shirt, defaultColor: '#f7f8fa' },
        { id: 'us-blazer', category: 'blazer', shape: 'blazer', label: 'Blazer', colors: COLOR_PRESETS.blazerSuit, defaultColor: '#54565c' },
        { id: 'us-suit-black', category: 'suit', shape: 'suit', label: 'Black Suit', colors: COLOR_PRESETS.blazerSuit, defaultColor: '#1c1c1e' },
        { id: 'us-suit-navy', category: 'suit', shape: 'suit', label: 'Navy Suit', colors: COLOR_PRESETS.blazerSuit, defaultColor: '#1f2a44' },
        { id: 'us-suit-gray', category: 'suit', shape: 'suit', label: 'Gray Suit', colors: COLOR_PRESETS.blazerSuit, defaultColor: '#54565c' },
        { id: 'us-jacket', category: 'jacket', shape: 'blazer', label: 'Professional Jacket', colors: COLOR_PRESETS.blazerSuit, defaultColor: '#33363d' },
        { id: 'us-coat', category: 'coat', shape: 'coat', label: 'Coat', colors: COLOR_PRESETS.blazerSuit, defaultColor: '#33363d' },
        { id: 'us-tie', category: 'tie', shape: 'tie', label: 'Tie', colors: COLOR_PRESETS.tie, defaultColor: '#6b1f2a' },
        { id: 'us-bowtie', category: 'tie', shape: 'bowtie', label: 'Bow Tie', colors: COLOR_PRESETS.tie, defaultColor: '#1c1c1e' }
    ];

    // Hijab / headscarf styles. `coverage` (0-1) controls how far down the
    // shoulders the fabric extends; `frame` controls how close to the face
    // oval the front frame sits (styles differ in how tightly they frame
    // the face, but ALL of them are clipped to never cover eyes/nose/
    // mouth/chin — see attireStudio.js buildFaceSafetyMask()).
    const HIJAB_STYLES = [
        { id: 'hijab-simple', label: 'Simple Wrapped Hijab', coverage: 0.55, frame: 0.06, description: 'Relaxed everyday wrap.' },
        { id: 'hijab-front-frame', label: 'Professional Front-Frame Hijab', coverage: 0.62, frame: 0.03, description: 'Neat frame close to the face, ideal for professional photos.' },
        { id: 'hijab-modest', label: 'Modest Headscarf', coverage: 0.5, frame: 0.08, description: 'Softer, looser drape.' },
        { id: 'hijab-rounded', label: 'Rounded Hijab', coverage: 0.6, frame: 0.05, description: 'Smooth rounded silhouette.' },
        { id: 'hijab-formal', label: 'Formal Hijab', coverage: 0.65, frame: 0.02, description: 'Crisp, structured formal style.' },
        { id: 'hijab-conservative-id', label: 'Conservative ID-Photo Style', coverage: 0.7, frame: 0.015, description: 'Maximum coverage while keeping the full face oval visible — matches conservative ID-photo guidance.' }
    ];

    function byCountry(countryId) {
        if (countryId === 'india') return INDIA_ATTIRE;
        if (countryId === 'usa') return USA_ATTIRE;
        // International: offer the union of both professional wardrobes.
        const seen = new Set();
        return [...INDIA_ATTIRE, ...USA_ATTIRE].filter((item) => {
            if (seen.has(item.category + item.shape + item.label)) return false;
            seen.add(item.category + item.shape + item.label);
            return true;
        });
    }

    function findAttire(countryId, attireId) {
        return byCountry(countryId).find((a) => a.id === attireId) || null;
    }

    function findHijab(hijabId) {
        return HIJAB_STYLES.find((h) => h.id === hijabId) || null;
    }

    window.PPGAttireCatalog = {
        COLOR_PRESETS,
        INDIA_ATTIRE,
        USA_ATTIRE,
        HIJAB_STYLES,
        byCountry,
        findAttire,
        findHijab
    };
})();
