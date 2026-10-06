import path from 'node:path';
/** Closed media catalog for declared images and exact reviewed local render dependencies. */
export const publicationResourceExtensions = new Map([
	['image/png', 'png'],
	['image/jpeg', 'jpg'],
	['image/webp', 'webp'],
	['image/svg+xml', 'svg'],
	['text/html', 'html'],
	['text/css', 'css'],
	['text/plain', 'txt'],
	['font/ttf', 'ttf'],
	['font/woff2', 'woff2'],
]);
/** Identify a reviewed renderer resource from its saved logical path.
 * @param {string} file - Safe relative file path.
 * @returns {string} - Supported media type.
 */
export function reviewedRenderMediaType(file) {
	const extension = path.extname(file).slice(1).toLowerCase();
	const media = [...publicationResourceExtensions].find(([, value]) => value === extension)?.[0];
	if (!media) throw new Error('Unsupported reviewed render resource: ' + file);
	return media;
}
