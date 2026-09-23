// Billing feature's private implementation; not a published feature entry.
export function settle(orderId) {
	return {orderId, status: 'settled'};
}
