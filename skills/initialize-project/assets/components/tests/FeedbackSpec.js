import React from 'react';
import BaseButton from '../BaseButton.jsx';
import BaseHelperText from '../BaseHelperText.jsx';
import BaseFormMessage from '../BaseFormMessage.jsx';
import {createTestHarness} from '../../testing/TestHarness.js';

const localize = {translate: (phrase) => ({'action.save': 'Save', 'action.save.aria': 'Save document', 'helper.error': 'Invalid value', 'message.saved': 'Saved.'})[phrase] ?? ''};

describe('button and feedback components', () => {
	let harness;
	afterEach(() => harness?.unmount());

	it('localizes button content, maps priority, and reports activation', () => {
		const clicked = jasmine.createSpy('clicked');
		harness = createTestHarness().withContext({localize, localizationEnabled: true, accessibilityEnabled: true});
		const result = harness.render(BaseButton, {localize: true, label: 'action.save', ariaLabel: 'action.save.aria', priority: 'primary', selected: true, onClick: clicked});
		const button = result.query('button');
		expect(button.textContent).toBe('Save');
		expect(button.getAttribute('aria-label')).toBe('Save document');
		expect(button.getAttribute('aria-pressed')).toBe('true');
		expect(button.className).toContain('MuiButton-contained');
		harness.click(button);
		expect(clicked).toHaveBeenCalled();
	});

	it('honors children, native disabled behavior, and optional aria defaults', () => {
		harness = createTestHarness().withContext({accessibilityEnabled: false});
		const result = harness.render(BaseButton, {label: 'ignored', ariaLabel: 'ignored', disabled: true, children: 'Child'});
		const button = result.query('button');
		expect(button.textContent).toBe('Child');
		expect(button.disabled).toBeTrue();
		expect(button.getAttribute('aria-label')).toBeNull();
	});

	it('keeps base button labels literal when localization is omitted', () => {
		harness = createTestHarness();
		const result = harness.render(BaseButton, {label: 'Literal label'});
		expect(result.query('button').textContent).toBe('Literal label');
	});

	it('suppresses empty helper text and applies accessible error semantics only when enabled', () => {
		harness = createTestHarness().withContext({localize, localizationEnabled: true, accessibilityEnabled: true});
		let result = harness.render(BaseHelperText, {localize: true, label: 'helper.error', status: 'error', id: 'error-help'});
		const helper = result.query('#error-help');
		expect(helper.textContent).toBe('Invalid value');
		expect(helper.getAttribute('role')).toBe('alert');
		expect(helper.getAttribute('aria-live')).toBe('assertive');
		result = result.rerender({label: ''});
		expect(result.container.children.length).toBe(0);
	});

	it('renders form messages by severity and returns no output for empty content', () => {
		harness = createTestHarness().withContext({localize, localizationEnabled: true});
		let result = harness.render(BaseFormMessage, {localize: true, label: 'message.saved', type: 'success'});
		const alert = result.query('[role="alert"]');
		expect(alert.textContent).toContain('Saved.');
		expect(alert.className).toContain('MuiAlert-colorSuccess');
		result = result.rerender({label: ''});
		expect(result.container.children.length).toBe(0);
	});

	it('covers normal, property-error, child, and non-accessible helper states', () => {
		harness = createTestHarness().withContext({accessibilityEnabled: true});
		let result = harness.render(BaseHelperText, {children: 'Normal help'});
		let helper = result.query('.MuiFormHelperText-root');
		expect(helper.getAttribute('role')).toBeNull();
		expect(helper.getAttribute('aria-live')).toBe('polite');
		result = result.rerender({children: 'Property error', error: true});
		expect(result.query('.MuiFormHelperText-root').getAttribute('role')).toBe('alert');
		harness.unmount();
		harness = createTestHarness().withContext({accessibilityEnabled: false});
		result = harness.render(BaseHelperText, {children: 'Inaccessible error', status: 'error'});
		helper = result.query('.MuiFormHelperText-root');
		expect(helper.getAttribute('role')).toBeNull();
		expect(helper.getAttribute('aria-live')).toBeNull();
	});

	it('covers form message defaults, children, and explicit Alert overrides', () => {
		harness = createTestHarness();
		let result = harness.render(BaseFormMessage, {children: 'Default message'});
		expect(result.query('[role="alert"]').className).toContain('MuiAlert-colorInfo');
		result = result.rerender({children: 'Override', severity: 'warning', variant: 'filled'});
		const alert = result.query('[role="alert"]');
		expect(alert.className).toContain('MuiAlert-colorWarning');
		expect(alert.className).toContain('MuiAlert-filled');
	});
});
