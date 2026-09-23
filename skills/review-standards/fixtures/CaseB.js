/** Projects controller data for an order page. */
export class CaseBView {
 constructor(controller, model) {
  this.controller = controller;
  this.model = model;
  this.screen = 'editing';
 }
 async submitOrder(draft) {
  if (draft.total > 1000) this.screen = 'approval';
  else {
   await this.model.saveOrder(draft);
   this.screen = 'complete';
  }
 }
}
