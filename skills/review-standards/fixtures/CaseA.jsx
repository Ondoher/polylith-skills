import React from 'react';

export default class CaseA extends React.Component {
 constructor(props) {
  super(props);
  this.state = {orders: [], selected: null};
 }
 async loadOrders() {
  const response = await fetch('/api/orders');
  const orders = await response.json();
  this.setState({orders});
 }
 render() {
  return (
   <main>
    <header>
     <h1>Orders</h1>
     <nav><a href="/help">Help</a><a href="/account">Account</a></nav>
     <button onClick={() => this.loadOrders()}>Refresh</button>
    </header>
    <section aria-label="Search and filters">
     <label>Search<input name="search" /></label>
     <label>Status<select name="status"><option>All</option><option>Open</option></select></label>
     <label><input type="checkbox" />Include archived orders</label>
    </section>
    <section aria-label="Order results">
     <table>
      <thead><tr><th>Order</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>{this.state.orders.map(order => <tr key={order.id}><td>{order.id}</td><td>{order.total}</td><td>{order.status}</td></tr>)}</tbody>
     </table>
     <p>{this.state.orders.length} orders shown</p>
    </section>
    <aside aria-label="Selected order">
     <h2>Details</h2>
     <dl><dt>Identifier</dt><dd>{this.state.selected?.id}</dd><dt>Status</dt><dd>{this.state.selected?.status}</dd></dl>
     <p>Select an order to inspect it.</p>
    </aside>
    <footer><p>Order support</p><a href="/contact">Contact support</a></footer>
   </main>
  );
 }
}
