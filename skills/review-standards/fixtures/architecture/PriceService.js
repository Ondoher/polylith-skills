export class PriceService {
	constructor(registry) {
		this.registry = registry;
	}
	start() {
		this.prices = this.registry.get('prices');
		this.prices.refresh();
		this.prices.on('changed', () => this.recalculate());
	}
	recalculate() {
		this.total = this.prices.total();
	}
	stop() {}
}
