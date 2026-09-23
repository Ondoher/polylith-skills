import React from 'react';

/** A small controlled presentation with no transport or domain ownership. */
export default class CaseD extends React.Component {
 constructor(props) {
  super(props);
  this.handleRefresh = this.handleRefresh.bind(this);
 }
 handleRefresh() { this.props.onRefresh(); }
 render() {
  return <button type="button" onClick={this.handleRefresh}>{this.props.label}</button>;
 }
}
