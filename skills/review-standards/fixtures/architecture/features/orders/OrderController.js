import {settle} from '../../shared/ledger.js';

export class OrderController {
	complete(orderId) {
		return settle(orderId);
	}
}
