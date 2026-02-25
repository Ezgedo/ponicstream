export interface TranslatorSettings {
    enabled: boolean;
    minWords: number;
    targetLanguage: string;
    sourceLanguages: string; // 'auto' or comma-separated list
    ignoredLanguages: string[];
}

export const DEFAULT_TRANSLATOR_SETTINGS: TranslatorSettings = {
    enabled: false,
    minWords: 3,
    targetLanguage: 'es',
    sourceLanguages: 'auto',
    ignoredLanguages: ['es'],
};

/**
 * Heuristic check if a text is in a specific language (currently only works well for Spanish).
 * @deprecated Use general language detection if possible, or refined heuristics.
 */
export function isLanguage(text: string, langCode: string): boolean {
    if (langCode !== 'es') return false; // Heuristic only for Spanish for now

    const spanishWords = new Set([
        'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'en', 'de', 'del',
        'con', 'por', 'para', 'que', 'si', 'no', 'este', 'esta', 'estos', 'estas',
        'yo', 'tu', 'nosotros', 'vosotros', 'ellos', 'mi', 'su', 'ser', 'estar', 'ha', 'es', 'son'
    ]);

    const words = text.toLowerCase().split(/\s+/);
    if (/[ñáéíóú¿¡]/i.test(text)) return true;

    let commonWordCount = 0;
    for (const word of words) {
        if (spanishWords.has(word)) commonWordCount++;
    }

    if (words.length > 0 && (commonWordCount / words.length) >= 0.2) return true;
    if (words.length <= 3 && commonWordCount >= 1) return true;

    return false;
}

const translationCache: Record<string, string> = {};

/**
 * Translates text based on provided settings.
 */
export async function translateText(text: string, settings: TranslatorSettings): Promise<string | null> {
    const trimmedText = text.trim();
    if (!trimmedText || !settings.enabled) return null;

    // Word count check
    const wordCount = trimmedText.split(/\s+/).length;
    if (wordCount < settings.minWords) return null;

    // If target language is Spanish, use our heuristic to save API calls
    if (settings.targetLanguage === 'es' && isLanguage(trimmedText, 'es')) return null;

    const cacheKey = `${settings.targetLanguage}:${trimmedText}`;
    if (translationCache[cacheKey]) return translationCache[cacheKey];

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${settings.sourceLanguages}&tl=${settings.targetLanguage}&dt=t&q=${encodeURIComponent(trimmedText)}`;
        const response = await fetch(url);

        if (!response.ok) return null;

        const data = await response.json();

        // data format: [[["translated", "source", ...], ...], languageIdentifier, ...]
        if (data && data[0] && data[0][0] && data[0][0][0]) {
            const translated = data[0][0][0];
            const detectedLang = data[2];

            // Filter logic: Ignore if detected language is the target language or in ignored list
            if (detectedLang === settings.targetLanguage) return null;
            if (settings.ignoredLanguages.includes(detectedLang)) return null;

            // If the translated text is the same as the original, might be untranslatable
            if (translated.toLowerCase() === trimmedText.toLowerCase()) return null;

            translationCache[cacheKey] = translated;
            return translated;
        }

        return null;
    } catch (error) {
        console.error("Translation error:", error);
        return null;
    }
}
