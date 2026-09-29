import tls from 'node:tls';

/** Use configured Node roots plus operating-system roots for the fixed observer upstream.
 * This retains certificate and hostname verification and sends no model request.
 * @returns {Promise<object>} - Trust-source counts and credential-free handshake timing.
 */
export async function verifyObserverTrust() {
	if (typeof tls.setDefaultCACertificates !== 'function')
		throw new Error('Observer requires Node with setDefaultCACertificates support');
	const configured = tls.getCACertificates('default');
	const system = tls.getCACertificates('system');
	const trusted = [...new Set([...configured, ...system])];
	tls.setDefaultCACertificates(trusted);
	const started = performance.now();
	await new Promise((resolve, reject) => {
		const socket = tls.connect(
			{host: 'chatgpt.com', port: 443, servername: 'chatgpt.com', rejectUnauthorized: true},
			() => {
				socket.end();
				resolve();
			},
		);
		socket.setTimeout(10000, () => socket.destroy(new Error('Observer upstream TLS preflight timed out')));
		socket.once('error', reject);
	});
	return {
		trust: 'node-configured-and-operating-system',
		configuredCertificates: configured.length,
		systemCertificates: system.length,
		trustedCertificates: trusted.length,
		upstream: 'chatgpt.com:443',
		certificateVerification: true,
		modelRequestSent: false,
		elapsedMs: performance.now() - started,
	};
}
