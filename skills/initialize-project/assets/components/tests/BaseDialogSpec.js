import React, {act} from 'react';
import BaseDialog from '../BaseDialog.jsx';
import {createTestHarness} from '../../testing/TestHarness.js';

const translations = {
	'dialog.title': 'Settings', 'dialog.changed': 'Changed title', 'dialog.description': 'Edit settings',
	'action.cancel': 'Cancel', 'action.save': 'Save', 'action.extra': 'Extra', 'status.changed': 'Mode changed', 'common.close': 'Close dialog',
	Close: 'Close',
};
const localize = {translate: (phrase) => translations[phrase] ?? ''};

function Child({dialog}) {
	return <div>
		<input aria-label="Child input" />
		<button type="button" onClick={() => dialog.setTitle('dialog.changed')}>Change title</button>
		<button type="button" onClick={() => dialog.setActionState('save', {enabled: false})}>Disable save</button>
		<button type="button" onClick={() => dialog.announce('status.changed')}>Announce</button>
		<button type="button" onClick={() => dialog.submit()}>Submit</button>
	</div>;
}

function FunctionChild(dialog) {
	return <div>
		<button type="button" onClick={() => dialog.setDescription('dialog.description')}>Set description</button>
		<button type="button" onClick={() => dialog.setActionState('unknown', {enabled: false})}>Update unknown</button>
	</div>;
}

function buttonByText(text) {
	return [...document.body.querySelectorAll('button')].find((button) => button.textContent.trim() === text);
}

describe('BaseDialog', () => {
	let harness;
	let pressed;
	let closed;
	let cancelled;
	let confirmed;
	beforeEach(() => {
		pressed = jasmine.createSpy('pressed');
		closed = jasmine.createSpy('closed');
		cancelled = jasmine.createSpy('cancelled');
		confirmed = jasmine.createSpy('confirmed');
		harness = createTestHarness().withContext({localize, localizationEnabled: true, accessibilityEnabled: true});
	});
	afterEach(() => harness?.unmount());

	function render(props = {}) {
		return harness.render(BaseDialog, {
			open: true, localize: true, title: 'dialog.title', description: 'dialog.description', showClose: true,
			closeLabel: 'common.close', onAction: pressed, onClose: closed, onCancel: cancelled, onConfirm: confirmed, resetToken: 1,
			actions: [{id: 'cancel', label: 'action.cancel', intent: 'cancel'}, {id: 'save', label: 'action.save', priority: 'primary', intent: 'confirm'}],
			children: <Child />,
			...props,
		});
	}

	it('renders localized, labelled portal content and ordered actions', () => {
		const result = render();
		const dialog = result.queryDocument('[role="dialog"]');
		expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
		expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
		expect(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent).toContain('Settings');
		expect(buttonByText('Cancel')).toBeTruthy();
		expect(buttonByText('Save')).toBeTruthy();
	});

	it('routes action, close, and child submit ids', () => {
		render();
		harness.click(buttonByText('Save'));
		harness.click(document.body.querySelector('.MuiBackdrop-root'));
		harness.click(document.body.querySelector('button[aria-label="Close dialog"]'));
		harness.click(buttonByText('Submit'));
		expect(pressed.calls.allArgs().map(([id]) => id)).toEqual(['save', 'close', 'close', 'submit']);
		expect(confirmed.calls.allArgs()).toEqual([['save'], ['submit']]);
		expect(cancelled).not.toHaveBeenCalled();
		expect(closed.calls.allArgs()).toEqual([['backdropClick'], ['closeButtonClick']]);
		harness.click(buttonByText('Cancel'));
		expect(cancelled).toHaveBeenCalledWith('cancel');
	});

	it('allows child state updates, focusable disabled actions, and announcements', () => {
		const result = render();
		const input = document.body.querySelector('input[aria-label="Child input"]');
		input.focus();
		result.rerender({description: 'dialog.description'});
		expect(document.activeElement).toBe(input);
		harness.click(buttonByText('Change title'));
		expect(document.body.textContent).toContain('Changed title');
		harness.click(buttonByText('Disable save'));
		const save = buttonByText('Save');
		expect(save.disabled).toBeFalse();
		expect(save.getAttribute('aria-disabled')).toBe('true');
		harness.click(save);
		expect(pressed).not.toHaveBeenCalledWith('save');
		harness.click(buttonByText('Announce'));
		expect(document.body.querySelector('[aria-live="polite"]').textContent).toBe('Mode changed');
	});

	it('retains child state for the same reset token and resets when the token changes', () => {
		const result = render();
		harness.click(buttonByText('Change title'));
		result.rerender({title: 'dialog.title', resetToken: 1});
		expect(document.body.textContent).toContain('Changed title');
		result.rerender({title: 'dialog.title', resetToken: 2});
		expect(document.body.textContent).toContain('Settings');
	});

	it('warns for invalid action configurations and hides requested actions', () => {
		spyOn(console, 'warn');
		render({actions: [
			{id: 'save', label: 'action.save', priority: 'primary'},
			{id: 'extra', label: 'action.extra', priority: 'primary'},
			{id: 'save', label: 'action.cancel'},
			{id: 'close', label: 'action.cancel', hidden: true},
		]});
		expect(console.warn).toHaveBeenCalled();
		expect(buttonByText('Extra')).toBeTruthy();
		expect(buttonByText('Cancel')).toBeUndefined();
	});

	it('covers literal defaults, empty content, function children, and supplied ids', () => {
		harness = createTestHarness().withContext({accessibilityEnabled: false});
		const result = harness.render(BaseDialog, {
			open: true, title: 'Literal title', titleId: 'provided-title', descriptionId: 'provided-description',
			children: FunctionChild,
		});
		const dialog = result.queryDocument('[role="dialog"]');
		expect(document.getElementById('provided-title').textContent).toContain('Literal title');
		expect(dialog.getAttribute('aria-labelledby')).not.toBe('provided-title');
		expect(dialog.getAttribute('aria-describedby')).not.toBe('provided-description');
		expect(buttonByText('Close')).toBeUndefined();
		expect(document.body.querySelector('.MuiDialogActions-root')).toBeNull();
		harness.click(document.body.querySelector('.MuiBackdrop-root'));
		expect(pressed).not.toHaveBeenCalled();
		harness.click(buttonByText('Set description'));
		expect(document.getElementById('provided-description').textContent).toContain('dialog.description');
		harness.click(buttonByText('Update unknown'));
	});

	it('covers non-accessible disabled actions and pressed action states', () => {
		harness = createTestHarness().withContext({accessibilityEnabled: false});
		let result = harness.render(BaseDialog, {
			open: true, title: 'Actions', showClose: true, onClose: closed, onAction: pressed,
			actions: [
				{id: 'disabled', label: 'Disabled', enabled: false},
				{id: 'toggle-off', label: 'Toggle off', pressable: true, pressed: false},
				{id: 'toggle-on', label: 'Toggle on', pressable: true, pressed: true},
			],
		});
		expect(buttonByText('Disabled').disabled).toBeTrue();
		expect(buttonByText('Toggle off').getAttribute('aria-pressed')).toBeNull();
		harness.click(buttonByText('Toggle on'));
		act(() => document.body.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})));
		expect(result.queryDocument('[role="dialog"]')).toBeTruthy();
		expect(closed).toHaveBeenCalledWith('escapeKeyDown');
		expect(pressed).toHaveBeenCalledWith('close');
		harness.unmount();
		harness = createTestHarness().withContext({accessibilityEnabled: true});
		result = harness.render(BaseDialog, {
			open: true, title: 'Actions', actions: [
				{id: 'toggle-off', label: 'Toggle off', pressable: true, pressed: false},
				{id: 'toggle-on', label: 'Toggle on', pressable: true, pressed: true},
			],
		});
		expect(buttonByText('Toggle off').getAttribute('aria-pressed')).toBe('false');
		expect(buttonByText('Toggle on').getAttribute('aria-pressed')).toBe('true');
	});

	it('restores focus to the invoking control when the dialog closes', () => {
		const opener = document.createElement('button');
		document.body.append(opener);
		opener.focus();
		const result = render({slotProps: {transition: {timeout: 0}}});
		expect(document.activeElement).not.toBe(opener);
		result.rerender({open: false, slotProps: {transition: {timeout: 0}}});
		expect(document.activeElement).toBe(opener);
		opener.remove();
	});

	it('warns independently for a missing action id', () => {
		spyOn(console, 'warn');
		render({actions: [{id: '', label: 'action.extra'}]});
		expect(console.warn).toHaveBeenCalledWith('BaseDialog action ids must be present and unique.');
	});

	it('uses default close text and resets an omitted action collection', () => {
		const result = render({closeLabel: undefined});
		expect(document.body.querySelector('button[aria-label="Close dialog"]')).toBeTruthy();
		result.rerender({resetToken: 2, actions: undefined});
		expect(document.body.querySelector('.MuiDialogActions-root')).toBeNull();
	});

	it('covers default close intent and defensive action rendering fallbacks', () => {
		const dialog = new BaseDialog({onClose: closed, onAction: pressed});
		dialog.context = {accessibilityEnabled: false};
		dialog.handleClose();
		expect(closed).toHaveBeenCalledWith('closeButtonClick');
		expect(pressed).toHaveBeenCalledWith('close');
		expect(dialog.renderAction({id: 'hidden', label: 'Hidden', hidden: true}, 0)).toBeNull();
		expect(dialog.renderAction({label: 'Fallback'}, 3).key).toBe('action-3');
	});
});
