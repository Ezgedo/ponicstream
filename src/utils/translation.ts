export interface TranslatorCommand {
    trigger: string;
    target: string;
}

export interface TranslatorSettings {
    enabled: boolean;
    minWords: number;
    targetLanguage: string;
    sourceLanguages: string; // 'auto' or comma-separated list
    ignoredLanguages: string[];
    commandsEnabled: boolean;
    commands: TranslatorCommand[];
}

export const DEFAULT_TRANSLATOR_SETTINGS: TranslatorSettings = {
    enabled: false,
    minWords: 3,
    targetLanguage: 'es',
    sourceLanguages: 'auto',
    ignoredLanguages: ['es'],
    commandsEnabled: false,
    commands: [
        { trigger: '!tsen', target: 'en' },
        { trigger: '!tses', target: 'es' },
        { trigger: '!tsit', target: 'it' },
        { trigger: '!tsjp', target: 'ja' },
    ],
};

const translationCache: Record<string, string> = {};

/**
 * Translates text based on provided settings.
 */
export async function translateText(text: string, settings: TranslatorSettings): Promise<string | null> {
    const trimmedText = text.trim();
    if (!trimmedText || !settings.enabled) return null;

    const wordCount = trimmedText.split(/\s+/).length;
    if (wordCount < settings.minWords) return null;


    const cacheKey = `${settings.targetLanguage}:${trimmedText}`;
    if (translationCache[cacheKey]) return translationCache[cacheKey];

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${settings.sourceLanguages}&tl=${settings.targetLanguage}&dt=t&q=${encodeURIComponent(trimmedText)}`;
        const response = await fetch(url);

        if (!response.ok) return null;

        const data = await response.json();

        if (data && data[0] && data[0][0] && data[0][0][0]) {
            const translated = data[0][0][0];
            const detectedLang = (data[2] || "").toLowerCase();

            if (detectedLang.startsWith(settings.targetLanguage.toLowerCase())) return null;
            if (settings.ignoredLanguages.some(lang => detectedLang.startsWith(lang.toLowerCase()))) return null;

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
