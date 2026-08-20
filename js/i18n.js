/**
 * MULTI-LANGUAGE SUPPORT (i18n)
 * ------------------------------
 * Lightweight, dependency-free translation layer. Marks elements with
 * `data-i18n` (text content), `data-i18n-placeholder` or `data-i18n-title`
 * attributes and swaps their content based on the selected language.
 *
 * The selected language is remembered in localStorage and applied on load,
 * so it persists across the Simple Mode and Advanced Editor pages.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'ppgLanguage';

    const translations = {
        en: {
            appTitle: 'Passport Photo Generator',
            editorTitle: 'Passport Photo Editor',
            headerDescription: 'Create professional passport photos instantly • Works entirely in your browser • No data uploaded to servers',
            editorHeaderDescription: 'Professional photo editor with advanced tools • Crop, adjust & enhance • Works entirely offline',
            advancedEditorLink: '✨ Advanced Editor →',
            simpleModeLink: '← Simple Mode',
            advancedEditorNavTitle: 'Advanced Editor',
            uploadLabel: 'Upload Photo:',
            uploadPhotoTitle: '📤 Upload Photo',
            useCameraBtn: '📷 Use Live Camera Studio',
            cameraPrivacyNote: '🔒 Camera photos are processed locally — never uploaded.',
            photoSizeLabel: 'Photo Size:',
            widthLabel: 'Width (mm):',
            heightLabel: 'Height (mm):',
            previewLabel: 'Preview:',
            printPhotosBtn: '🖨️ Print Photos',
            generatePdfBtn: '📄 Generate PDF',
            adjustmentsTitle: '🎨 Adjustments',
            filtersTitle: '🎞️ Filters & Effects',
            backgroundTitle: '🖼️ Background',
            removeBgLabel: '✂️ Remove Background (AI)',
            batchTitle: '📦 Batch Processing',
            batchHint: 'Apply the current adjustments, background & filters to multiple photos at once.',
            processBatchBtn: '⚙️ Process Batch',
            downloadZipBtn: '📥 Download All (ZIP)',
            downloadBatchPdfBtn: '📥 Download All (PDF)',
            compareBtn: '🔍 Before/After',
            footerOffline: 'Works Offline • No Data Saved',
            footerMade: 'Made with ❤️ in India',
            languageLabel: '🌐 Language'
        },
        es: {
            appTitle: 'Generador de Fotos de Pasaporte',
            editorTitle: 'Editor de Fotos de Pasaporte',
            headerDescription: 'Crea fotos de pasaporte profesionales al instante • Funciona totalmente en tu navegador • Sin subir datos a servidores',
            editorHeaderDescription: 'Editor de fotos profesional con herramientas avanzadas • Recorta, ajusta y mejora • Funciona sin conexión',
            advancedEditorLink: '✨ Editor Avanzado →',
            simpleModeLink: '← Modo Simple',
            advancedEditorNavTitle: 'Editor Avanzado',
            uploadLabel: 'Subir Foto:',
            uploadPhotoTitle: '📤 Subir Foto',
            useCameraBtn: '📷 Usar Estudio de Cámara en Vivo',
            cameraPrivacyNote: '🔒 Las fotos de la cámara se procesan localmente — nunca se suben.',
            photoSizeLabel: 'Tamaño de Foto:',
            widthLabel: 'Ancho (mm):',
            heightLabel: 'Alto (mm):',
            previewLabel: 'Vista Previa:',
            printPhotosBtn: '🖨️ Imprimir Fotos',
            generatePdfBtn: '📄 Generar PDF',
            adjustmentsTitle: '🎨 Ajustes',
            filtersTitle: '🎞️ Filtros y Efectos',
            backgroundTitle: '🖼️ Fondo',
            removeBgLabel: '✂️ Quitar Fondo (IA)',
            batchTitle: '📦 Procesamiento por Lotes',
            batchHint: 'Aplica los ajustes, fondo y filtros actuales a varias fotos a la vez.',
            processBatchBtn: '⚙️ Procesar Lote',
            downloadZipBtn: '📥 Descargar Todo (ZIP)',
            downloadBatchPdfBtn: '📥 Descargar Todo (PDF)',
            compareBtn: '🔍 Antes/Después',
            footerOffline: 'Funciona sin conexión • Sin datos guardados',
            footerMade: 'Hecho con ❤️ en India',
            languageLabel: '🌐 Idioma'
        },
        fr: {
            appTitle: 'Générateur de Photos de Passeport',
            editorTitle: "Éditeur de Photos de Passeport",
            headerDescription: 'Créez des photos de passeport professionnelles instantanément • Fonctionne entièrement dans votre navigateur • Aucune donnée envoyée aux serveurs',
            editorHeaderDescription: 'Éditeur de photos professionnel avec outils avancés • Recadrer, ajuster et améliorer • Fonctionne hors ligne',
            advancedEditorLink: '✨ Éditeur Avancé →',
            simpleModeLink: '← Mode Simple',
            advancedEditorNavTitle: 'Éditeur Avancé',
            uploadLabel: 'Téléverser la Photo :',
            uploadPhotoTitle: '📤 Téléverser la Photo',
            useCameraBtn: '📷 Utiliser le Studio Caméra en Direct',
            cameraPrivacyNote: '🔒 Les photos de la caméra sont traitées localement — jamais envoyées.',
            photoSizeLabel: 'Taille de la Photo :',
            widthLabel: 'Largeur (mm) :',
            heightLabel: 'Hauteur (mm) :',
            previewLabel: 'Aperçu :',
            printPhotosBtn: '🖨️ Imprimer les Photos',
            generatePdfBtn: '📄 Générer le PDF',
            adjustmentsTitle: '🎨 Réglages',
            filtersTitle: '🎞️ Filtres et Effets',
            backgroundTitle: '🖼️ Arrière-plan',
            removeBgLabel: '✂️ Supprimer l\'arrière-plan (IA)',
            batchTitle: '📦 Traitement par Lots',
            batchHint: 'Appliquez les réglages, l\'arrière-plan et les filtres actuels à plusieurs photos à la fois.',
            processBatchBtn: '⚙️ Traiter le Lot',
            downloadZipBtn: '📥 Tout Télécharger (ZIP)',
            downloadBatchPdfBtn: '📥 Tout Télécharger (PDF)',
            compareBtn: '🔍 Avant/Après',
            footerOffline: 'Fonctionne hors ligne • Aucune donnée enregistrée',
            footerMade: 'Fait avec ❤️ en Inde',
            languageLabel: '🌐 Langue'
        },
        hi: {
            appTitle: 'पासपोर्ट फोटो जनरेटर',
            editorTitle: 'पासपोर्ट फोटो एडिटर',
            headerDescription: 'तुरंत पेशेवर पासपोर्ट फोटो बनाएं • पूरी तरह आपके ब्राउज़र में काम करता है • कोई डेटा सर्वर पर अपलोड नहीं होता',
            editorHeaderDescription: 'उन्नत टूल्स वाला पेशेवर फोटो एडिटर • क्रॉप, समायोजित और बेहतर बनाएं • पूरी तरह ऑफलाइन काम करता है',
            advancedEditorLink: '✨ एडवांस्ड एडिटर →',
            simpleModeLink: '← सरल मोड',
            advancedEditorNavTitle: 'एडवांस्ड एडिटर',
            uploadLabel: 'फोटो अपलोड करें:',
            uploadPhotoTitle: '📤 फोटो अपलोड करें',
            useCameraBtn: '📷 लाइव कैमरा स्टूडियो का उपयोग करें',
            cameraPrivacyNote: '🔒 कैमरा फोटो स्थानीय रूप से प्रोसेस होते हैं — कभी अपलोड नहीं होते।',
            photoSizeLabel: 'फोटो साइज़:',
            widthLabel: 'चौड़ाई (mm):',
            heightLabel: 'ऊंचाई (mm):',
            previewLabel: 'पूर्वावलोकन:',
            printPhotosBtn: '🖨️ फोटो प्रिंट करें',
            generatePdfBtn: '📄 पीडीएफ बनाएं',
            adjustmentsTitle: '🎨 समायोजन',
            filtersTitle: '🎞️ फ़िल्टर और प्रभाव',
            backgroundTitle: '🖼️ बैकग्राउंड',
            removeBgLabel: '✂️ बैकग्राउंड हटाएं (AI)',
            batchTitle: '📦 बैच प्रोसेसिंग',
            batchHint: 'वर्तमान समायोजन, बैकग्राउंड और फ़िल्टर एक साथ कई फोटो पर लागू करें।',
            processBatchBtn: '⚙️ बैच प्रोसेस करें',
            downloadZipBtn: '📥 सभी डाउनलोड करें (ZIP)',
            downloadBatchPdfBtn: '📥 सभी डाउनलोड करें (PDF)',
            compareBtn: '🔍 पहले/बाद में',
            footerOffline: 'ऑफलाइन काम करता है • कोई डेटा सहेजा नहीं जाता',
            footerMade: 'भारत में ❤️ से बनाया गया',
            languageLabel: '🌐 भाषा'
        },
        de: {
            appTitle: 'Passfoto-Generator',
            editorTitle: 'Passfoto-Editor',
            headerDescription: 'Erstellen Sie sofort professionelle Passfotos • Läuft komplett in Ihrem Browser • Keine Daten werden an Server gesendet',
            editorHeaderDescription: 'Professioneller Foto-Editor mit erweiterten Tools • Zuschneiden, anpassen & verbessern • Funktioniert komplett offline',
            advancedEditorLink: '✨ Erweiterter Editor →',
            simpleModeLink: '← Einfacher Modus',
            advancedEditorNavTitle: 'Erweiterter Editor',
            uploadLabel: 'Foto hochladen:',
            uploadPhotoTitle: '📤 Foto hochladen',
            useCameraBtn: '📷 Live-Kamera-Studio verwenden',
            cameraPrivacyNote: '🔒 Kamerafotos werden lokal verarbeitet — nie hochgeladen.',
            photoSizeLabel: 'Fotogröße:',
            widthLabel: 'Breite (mm):',
            heightLabel: 'Höhe (mm):',
            previewLabel: 'Vorschau:',
            printPhotosBtn: '🖨️ Fotos drucken',
            generatePdfBtn: '📄 PDF erstellen',
            adjustmentsTitle: '🎨 Anpassungen',
            filtersTitle: '🎞️ Filter & Effekte',
            backgroundTitle: '🖼️ Hintergrund',
            removeBgLabel: '✂️ Hintergrund entfernen (KI)',
            batchTitle: '📦 Stapelverarbeitung',
            batchHint: 'Wenden Sie die aktuellen Anpassungen, den Hintergrund und die Filter auf mehrere Fotos gleichzeitig an.',
            processBatchBtn: '⚙️ Stapel verarbeiten',
            downloadZipBtn: '📥 Alle herunterladen (ZIP)',
            downloadBatchPdfBtn: '📥 Alle herunterladen (PDF)',
            compareBtn: '🔍 Vorher/Nachher',
            footerOffline: 'Funktioniert offline • Keine Daten gespeichert',
            footerMade: 'Mit ❤️ in Indien gemacht',
            languageLabel: '🌐 Sprache'
        },
        pt: {
            appTitle: 'Gerador de Fotos de Passaporte',
            editorTitle: 'Editor de Fotos de Passaporte',
            headerDescription: 'Crie fotos de passaporte profissionais instantaneamente • Funciona totalmente no seu navegador • Nenhum dado é enviado a servidores',
            editorHeaderDescription: 'Editor de fotos profissional com ferramentas avançadas • Recorte, ajuste e melhore • Funciona totalmente offline',
            advancedEditorLink: '✨ Editor Avançado →',
            simpleModeLink: '← Modo Simples',
            advancedEditorNavTitle: 'Editor Avançado',
            uploadLabel: 'Enviar Foto:',
            uploadPhotoTitle: '📤 Enviar Foto',
            useCameraBtn: '📷 Usar Estúdio de Câmera ao Vivo',
            cameraPrivacyNote: '🔒 As fotos da câmera são processadas localmente — nunca enviadas.',
            photoSizeLabel: 'Tamanho da Foto:',
            widthLabel: 'Largura (mm):',
            heightLabel: 'Altura (mm):',
            previewLabel: 'Pré-visualização:',
            printPhotosBtn: '🖨️ Imprimir Fotos',
            generatePdfBtn: '📄 Gerar PDF',
            adjustmentsTitle: '🎨 Ajustes',
            filtersTitle: '🎞️ Filtros e Efeitos',
            backgroundTitle: '🖼️ Fundo',
            removeBgLabel: '✂️ Remover Fundo (IA)',
            batchTitle: '📦 Processamento em Lote',
            batchHint: 'Aplique os ajustes, o fundo e os filtros atuais a várias fotos de uma vez.',
            processBatchBtn: '⚙️ Processar Lote',
            downloadZipBtn: '📥 Baixar Tudo (ZIP)',
            downloadBatchPdfBtn: '📥 Baixar Tudo (PDF)',
            compareBtn: '🔍 Antes/Depois',
            footerOffline: 'Funciona offline • Nenhum dado salvo',
            footerMade: 'Feito com ❤️ na Índia',
            languageLabel: '🌐 Idioma'
        }
    };

    function applyLanguage(lang) {
        const dict = translations[lang] ? lang : 'en';
        const strings = translations[dict];

        document.documentElement.lang = dict;

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (strings[key]) el.textContent = strings[key];
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (strings[key]) el.setAttribute('placeholder', strings[key]);
        });

        document.querySelectorAll('[data-i18n-title]').forEach((el) => {
            const key = el.getAttribute('data-i18n-title');
            if (strings[key]) el.setAttribute('title', strings[key]);
        });

        try {
            localStorage.setItem(STORAGE_KEY, dict);
        } catch (err) {
            // localStorage may be unavailable (e.g. private browsing); ignore.
        }

        const selector = document.getElementById('languageSelect');
        if (selector && selector.value !== dict) selector.value = dict;
    }

    function detectInitialLanguage() {
        let saved = null;
        try {
            saved = localStorage.getItem(STORAGE_KEY);
        } catch (err) {
            saved = null;
        }
        if (saved && translations[saved]) return saved;

        const browserLang = ((navigator.language || 'en').split('-')[0] || 'en').toLowerCase();
        if (translations[browserLang]) return browserLang;

        return 'en';
    }

    function init() {
        applyLanguage(detectInitialLanguage());

        const selector = document.getElementById('languageSelect');
        if (selector) {
            selector.addEventListener('change', (e) => applyLanguage(e.target.value));
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.PPGi18n = { applyLanguage, translations };
})();
