/**
 * COUNTRY & DOCUMENT PRESET SYSTEM
 * --------------------------------
 * Defines photo dimensions, framing guidance, background recommendations
 * and which professional attire categories are offered for a given
 * country / document combination.
 *
 * ⚠️ IMPORTANT: None of this data should be read as an officially verified
 * requirement. Passport/visa/ID photo rules change frequently and vary by
 * issuing authority. Every preset carries a `disclaimer` string that the UI
 * must always display next to any recommendation generated from it.
 */
(function () {
    'use strict';

    const DISCLAIMER =
        'This is general guidance only, not an officially verified requirement. ' +
        'Always confirm exact photo and attire rules with the specific passport, visa ' +
        'or ID document issuing authority before submission.';

    const PRESETS = {
        india: {
            id: 'india',
            flag: '🇮🇳',
            label: 'India',
            documents: [
                {
                    id: 'passport',
                    label: 'Indian Passport',
                    widthMM: 51, heightMM: 51,
                    faceHeightPct: [0.60, 0.75],
                    background: 'Plain white or very light off-white background.',
                    attireGuidance:
                        'Formal, solid-colour clothing is recommended. Avoid uniforms, camouflage ' +
                        'and busy patterns. Religious headwear is permitted if the full face from ' +
                        'chin to forehead and both edges of the face remain visible.',
                    attireCategories: ['shirt', 'blazer', 'suit', 'tie', 'hijab'],
                    allowHijab: true
                },
                {
                    id: 'pan-oci',
                    label: 'PAN Card / OCI / Visa',
                    widthMM: 35, heightMM: 45,
                    faceHeightPct: [0.55, 0.70],
                    background: 'Plain white background, neutral expression.',
                    attireGuidance:
                        'Business/formal attire is a common recommendation for professional-looking ' +
                        'ID photos. Follow the specific form/authority instructions for exact rules.',
                    attireCategories: ['shirt', 'blazer', 'suit', 'tie', 'hijab'],
                    allowHijab: true
                }
            ]
        },
        usa: {
            id: 'usa',
            flag: '🇺🇸',
            label: 'United States',
            documents: [
                {
                    id: 'passport',
                    label: 'US Passport / Visa',
                    widthMM: 51, heightMM: 51,
                    faceHeightPct: [0.50, 0.69],
                    background: 'Plain white or off-white background, no shadows.',
                    attireGuidance:
                        'Everyday professional or business-casual clothing is typically acceptable. ' +
                        'Attire shown here is an optional enhancement for a polished, professional ' +
                        'look — it is not itself an official passport requirement. Uniforms (other ' +
                        'than religious attire worn daily) are usually discouraged.',
                    attireCategories: ['shirt', 'blazer', 'suit', 'jacket', 'tie', 'hijab'],
                    allowHijab: true
                },
                {
                    id: 'employment-id',
                    label: 'Professional / Employment ID',
                    widthMM: 51, heightMM: 51,
                    faceHeightPct: [0.55, 0.72],
                    background: 'Neutral light gray, blue or white background.',
                    attireGuidance:
                        'A business suit, blazer or collared shirt is a common professional ' +
                        'recommendation for corporate ID and profile photos.',
                    attireCategories: ['shirt', 'blazer', 'suit', 'jacket', 'tie', 'hijab'],
                    allowHijab: true
                }
            ]
        },
        international: {
            id: 'international',
            flag: '🌍',
            label: 'International / Other',
            documents: [
                {
                    id: 'icao-passport',
                    label: 'ICAO-style Passport/Visa',
                    widthMM: 35, heightMM: 45,
                    faceHeightPct: [0.60, 0.75],
                    background: 'Plain, evenly lit, light-coloured background (white/light gray).',
                    attireGuidance:
                        'Most ICAO-compliant documents recommend plain, formal clothing without ' +
                        'uniforms, sunglasses or headwear (except for religious/medical reasons, ' +
                        'when the full face oval must stay visible). Verify against the destination ' +
                        'country\'s own rules.',
                    attireCategories: ['shirt', 'blazer', 'suit', 'jacket', 'coat', 'tie', 'hijab'],
                    allowHijab: true
                },
                {
                    id: 'generic-id',
                    label: 'Generic Professional ID',
                    widthMM: 35, heightMM: 45,
                    faceHeightPct: [0.55, 0.72],
                    background: 'Neutral solid background.',
                    attireGuidance:
                        'A conservative, solid-colour professional outfit is a safe general choice ' +
                        'for most ID-style photographs worldwide.',
                    attireCategories: ['shirt', 'blazer', 'suit', 'jacket', 'coat', 'tie', 'hijab'],
                    allowHijab: true
                }
            ]
        }
    };

    function listCountries() {
        return Object.values(PRESETS).map((c) => ({ id: c.id, flag: c.flag, label: c.label }));
    }

    function listDocuments(countryId) {
        const c = PRESETS[countryId];
        return c ? c.documents : [];
    }

    function getDocument(countryId, documentId) {
        const docs = listDocuments(countryId);
        return docs.find((d) => d.id === documentId) || docs[0] || null;
    }

    window.PPGCountryPresets = {
        DISCLAIMER,
        PRESETS,
        listCountries,
        listDocuments,
        getDocument
    };
})();
