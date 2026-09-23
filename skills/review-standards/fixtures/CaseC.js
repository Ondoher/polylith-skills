/** Owns user-facing order workflow. */
export class CaseCController {
 constructor(view) { this.view = view; }
 saveOrder(order) {
  localStorage.setItem('orders', JSON.stringify(order));
  this.view.showComplete();
 }
}
