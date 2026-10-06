import {createHash} from 'node:crypto';
import {validateUiImageAssetBytes} from './ui-composition.mjs';

/** Validate bounded resource bytes against their declaration before copying them.
 * @param {{id: string, mediaType: string, sha256: string}} descriptor - Exact declared identity.
 * @param {Buffer} bytes - Saved resource bytes.
 * @returns {void}
 */
export function validatePublicationResourceBytes(descriptor, bytes) {
	if (
		!Buffer.isBuffer(bytes) ||
		!bytes.length ||
		bytes.length > 20 * 1024 * 1024 ||
		createHash('sha256').update(bytes).digest('hex') !== descriptor.sha256
	)
		throw new Error('Resource bytes or hash do not match descriptor');
	if (descriptor.mediaType.startsWith('image/')) {
		validateUiImageAssetBytes(
			{id: descriptor.id, mimeType: descriptor.mediaType, sha256: descriptor.sha256},
			bytes,
		);
	} else if (['text/html', 'text/css', 'text/plain'].includes(descriptor.mediaType)) {
		new TextDecoder('utf-8', {fatal: true}).decode(bytes);
	} else if (descriptor.mediaType === 'font/ttf') {
		if (bytes.length < 12 || !['00010000', '4f54544f', '74727565'].includes(bytes.subarray(0, 4).toString('hex')))
			throw new Error('Invalid reviewed font bytes');
	} else if (descriptor.mediaType === 'font/woff2') {
		if (bytes.length < 48 || bytes.subarray(0, 4).toString('ascii') !== 'wOF2')
			throw new Error('Invalid reviewed font bytes');
	} else throw new Error('Unsupported publication resource media type');
}
