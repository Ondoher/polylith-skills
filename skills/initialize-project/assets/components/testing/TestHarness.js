import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {Registry} from '@polylith/core';
import AppContext from '../common/AppContext.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Browser component-test harness that owns React roots, context, and DOM interactions. */
export class TestHarness {
	/** Creates an isolated component-test harness with the default application context. */
	constructor() {
		this.props = {};
		this.registry = new Registry();
		this.context = {
			registry: this.registry,
			locale: 'en-US',
			localize: null,
			localizationEnabled: false,
			accessibilityEnabled: false,
		};
		this.container = null;
		this.root = null;
	}

	/** Call this method to add default properties for subsequent renders. @param {object} props - The properties to merge. @returns {TestHarness} - This harness. */
	withProps(props = {}) {
		this.props = {...this.props, ...props};
		return this;
	}

	/** Call this method to add application-context values for subsequent renders. @param {object} context - The context values to merge. @returns {TestHarness} - This harness. */
	withContext(context = {}) {
		this.context = {...this.context, ...context};
		return this;
	}

	/** Call this method to install a registry or register a service map. @param {object} registryOrServices - The registry or named services. @returns {TestHarness} - This harness. */
	withRegistry(registryOrServices = {}) {
		if (typeof registryOrServices?.subscribe === 'function') {
			this.registry = registryOrServices;
		} else {
			for (const [name, service] of Object.entries(registryOrServices)) this.registry.register(name, service);
		}
		this.context = {...this.context, registry: this.registry};
		return this;
	}

	/** Call this method to register one test service. @param {string} name - The service name. @param {unknown} service - The service implementation. @returns {TestHarness} - This harness. */
	withService(name, service) {
		this.registry.register(name, service);
		return this;
	}

	/** Call this method to render a component inside the configured application context. @param {React.ComponentType<object>} Component - The component to render. @param {object} props - The render properties. @returns {object} - DOM queries and lifecycle operations. */
	render(Component, props = {}) {
		this.Component = Component;
		this.renderProps = {...this.props, ...props};
		if (!this.container) {
			this.container = document.createElement('div');
			document.body.appendChild(this.container);
		}
		if (!this.root) this.root = createRoot(this.container);
		act(() => {
			this.root.render(
				<AppContext.Provider value={{...this.context, registry: this.registry}}>
					<Component {...this.renderProps} />
				</AppContext.Provider>,
			);
		});
		return this.result();
	}

	/** Call this method to rerender the current component with merged properties. @param {object} props - The properties to merge. @returns {object} - DOM queries and lifecycle operations. */
	rerender(props = {}) {
		if (!this.Component) throw new Error('Render a component before rerendering it.');
		return this.render(this.Component, {...this.renderProps, ...props});
	}

	/** Call this method to obtain DOM queries and lifecycle operations. @returns {object} - The current harness result. */
	result() {
		return {
			container: this.container,
			document: document.body,
			query: (selector) => this.container.querySelector(selector),
			queryAll: (selector) => [...this.container.querySelectorAll(selector)],
			queryDocument: (selector) => document.body.querySelector(selector),
			queryDocumentAll: (selector) => [...document.body.querySelectorAll(selector)],
			rerender: this.rerender.bind(this),
			unmount: this.unmount.bind(this),
		};
	}

	/** Call this method to dispatch an activated mouse click. @param {Element} element - The target element. */
	click(element) {
		act(() => element.dispatchEvent(new MouseEvent('click', {bubbles: true})));
	}

	/** Call this method to set a native value and dispatch input and change events. @param {Element} element - The target input element. @param {unknown} value - The value to install. */
	input(element, value) {
		act(() => {
			setNativeValue(element, value);
			element.dispatchEvent(new Event('input', {bubbles: true}));
			element.dispatchEvent(new Event('change', {bubbles: true}));
		});
	}

	/** Call this method to unmount the current root and remove its DOM container. */
	unmount() {
		if (!this.root) return;
		act(() => this.root.unmount());
		this.root = null;
		this.container?.remove();
		this.container = null;
		this.Component = null;
	}
}

/** Called by the harness to invoke React-compatible native value setters. @param {Element} element - The target input element. @param {unknown} value - The value to install. */
function setNativeValue(element, value) {
	const ownSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
	const prototypeSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;
	(prototypeSetter && ownSetter !== prototypeSetter ? prototypeSetter : ownSetter)?.call(element, value);
}

/** Call this function to create an isolated component-test harness. @returns {TestHarness} - A new harness. */
export const createTestHarness = () => new TestHarness();
