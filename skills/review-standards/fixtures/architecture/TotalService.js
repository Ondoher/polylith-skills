export class TotalService {
	constructor(registry) {
		this.registry = registry;
		this.handleChanged = this.handleChanged.bind(this);
	}
	start() {
		this.total = 0;
	}
	ready() {
		this.prices = this.registry.get('prices');
		this.prices.on('changed', this.handleChanged);
		this.prices.refresh();
	}
	handleChanged() {
		this.total = this.prices.total();
	}
	stop() {
		if (!this.prices) return;
		this.prices.off('changed', this.handleChanged);
		this.prices = null;
	}
}
