export class InvoiceController {
	constructor(registry) {
		this.registry = registry;
	}
	ready() {
		this.billing = this.registry.get('billing');
	}
	complete(orderId) {
		return this.billing.settle(orderId);
	}
}
