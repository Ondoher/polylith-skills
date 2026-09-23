/**
 * Call this function to resolve a component's literal value or localized phrase.
 *
 * @param {AppContextValue} context - The current global application context.
 * @param {boolean} localize - Whether the supplied value is a phrase key.
 * @param {unknown} value - The literal value or phrase key to resolve.
 * @param {string} fallback - The value returned when no text was supplied.
 * @param {Record<string, string | number>} [replacements] - Phrase replacement values.
 * @param {number} [cardinal] - The plural-selection cardinal value.
 * @returns {string} - The resolved display text.
 */
export function resolveComponentText(context, localize, value, fallback = '', replacements, cardinal) {
	if (value === undefined || value === null || value === '') return fallback;
	if (localize && context.localizationEnabled)
		return context.localize?.translate(value, replacements, cardinal, context.locale) ?? '';
	return String(value);
}
