/**
 * Simple heuristic to check if a text is likely in Spanish.
 * Checks for common Spanish words and specific characters (ñ, á, é, í, ó, ú, ¿, ¡).
 */
export function isSpanish(text: string): boolean {
    const spanishWords = new Set([
        'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'en', 'de', 'del',
        'con', 'por', 'para', 'que', 'si', 'no', 'si', 'este', 'esta', 'estos', 'estas',
        'yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos', 'mi', 'su', 'ser', 'estar', 'ha', 'es', 'son'
    ]);

    const words = text.toLowerCase().split(/\s+/);

    // 1. Check for specific Spanish characters
    if (/[ñáéíóú¿¡]/i.test(text)) return true;

    // 2. Count common Spanish words
    let commonWordCount = 0;
    for (const word of words) {
        if (spanishWords.has(word)) commonWordCount++;
    }

    // If more than 20% of words are common Spanish words, we assume it's Spanish
    // Or if it's a very short message with at least one common word
    if (words.length > 0 && (commonWordCount / words.length) >= 0.2) return true;
    if (words.length <= 3 && commonWordCount >= 1) return true;

    return false;
}

const translationCache: Record<string, string> = {};

/**
 * Translates text to Spanish using the Google gtx API.
 * Returns null if translation fails or is unnecessary.
 */
export async function translateToSpanish(text: string): Promise<string | null> {
    if (!text.trim()) return null;
    if (isSpanish(text)) return null;

    if (translationCache[text]) return translationCache[text];

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);

        if (!response.ok) return null;

        const data = await response.json();

        // Google gtx API returns an array: [[["translated", "source", ...], ...], ...]
        if (data && data[0] && data[0][0] && data[0][0][0]) {
            const translated = data[0][0][0];

            // If the translated text is the same as the original, might be untranslatable
            if (translated.toLowerCase() === text.toLowerCase()) return null;

            translationCache[text] = translated;
            return translated;
        }

        return null;
    } catch (error) {
        console.error("Translation error:", error);
        return null;
    }
}
