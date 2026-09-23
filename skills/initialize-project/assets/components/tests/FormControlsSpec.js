import React from 'react';
import BaseTextInput from '../BaseTextInput.jsx';
import TextInput from '../TextInput.jsx';
import BaseSelect from '../BaseSelect.jsx';
import Select from '../Select.jsx';
import BaseCheckbox from '../BaseCheckbox.jsx';
import BaseRadioButtons from '../BaseRadioButtons.jsx';
import AppContext from '../../common/AppContext.js';
import {resolveComponentText} from '../component-text.js';
import {createTestHarness} from '../../testing/TestHarness.js';

const phrases = {
	'name.label': 'Name', 'name.helper': 'Enter a name', 'name.aria': 'Editable name',
	'mode.label': 'Mode', 'mode.helper': 'Choose a mode', 'mode.major': 'Major', 'mode.minor': 'Minor',
	'enabled.label': 'Enabled', 'enabled.helper': 'Turns the feature on',
	'choice.label': 'Choice', 'choice.first': 'First', 'choice.second': 'Second',
};
const localize = {translate: (phrase) => phrases[phrase] ?? ''};

class TextProbe extends React.Component {
	static contextType = AppContext;
	render() { return <span>{resolveComponentText(this.context, this.props.localize, this.props.value, this.props.fallback)}</span>; }
}

describe('generated form controls', () => {
	let harness;
	afterEach(() => harness?.unmount());

	it('keeps base text input literal and makes the concrete input localize', () => {
		harness = createTestHarness().withContext({localize, localizationEnabled: true});
		let result = harness.render(BaseTextInput, {label: 'name.label', helperText: 'name.helper'});
		expect(result.container.textContent).toContain('name.label');
		result = result.rerender({});
		harness.unmount();
		harness = createTestHarness().withContext({localize, localizationEnabled: true});
		result = harness.render(TextInput, {label: 'name.label', helperText: 'name.helper'});
		expect(result.container.textContent).toContain('Name');
		expect(result.container.querySelector('.MuiFormHelperText-root').textContent).toBe('Enter a name');
	});

	it('reports text changes and adds authored aria only when accessibility is enabled', () => {
		const changed = jasmine.createSpy('changed');
		harness = createTestHarness().withContext({localize, localizationEnabled: true, accessibilityEnabled: false});
		let result = harness.render(TextInput, {ariaLabel: 'name.aria', label: 'name.label', onChange: changed});
		let input = result.query('input');
		expect(input.getAttribute('aria-label')).toBeNull();
		harness.input(input, 'Ada');
		expect(changed).toHaveBeenCalled();
		harness.unmount();
		harness = createTestHarness().withContext({localize, localizationEnabled: true, accessibilityEnabled: true});
		result = harness.render(TextInput, {ariaLabel: 'name.aria', label: 'name.label'});
		input = result.query('input');
		expect(input.getAttribute('aria-label')).toBe('Editable name');
	});

	it('renders localized concrete select options, helper wiring, disabled and error states', () => {
		harness = createTestHarness().withContext({localize, localizationEnabled: true, accessibilityEnabled: true});
		const result = harness.render(Select, {
			label: 'mode.label', helperText: 'mode.helper', value: 'minor', error: true, disabled: true,
			options: [{value: 'major', label: 'mode.major'}, {value: 'minor', label: 'mode.minor'}],
		});
		const combobox = result.query('[role="combobox"]');
		const helper = result.query('.MuiFormHelperText-root');
		expect(result.container.textContent).toContain('Minor');
		expect(helper.textContent).toBe('Choose a mode');
		expect(combobox.getAttribute('aria-describedby')).toBe(helper.id);
		expect(combobox.getAttribute('aria-disabled')).toBe('true');
		expect(result.query('.Mui-error')).toBeTruthy();
	});

	it('reports native select values through the normalized callback', () => {
		const changed = jasmine.createSpy('changed');
		harness = createTestHarness();
		const result = harness.render(BaseSelect, {
			label: 'Mode', value: 'major', onChange: changed, selectProps: {native: true},
			options: [{value: 'major', label: 'Major'}, {value: 'minor', label: 'Minor'}],
		});
		harness.input(result.query('select'), 'minor');
		expect(changed).toHaveBeenCalled();
		expect(changed.calls.mostRecent().args[0]).toBe('minor');
	});

	it('wires localized checkbox helper text and reports boolean changes', () => {
		const changed = jasmine.createSpy('changed');
		harness = createTestHarness().withContext({localize, localizationEnabled: true, accessibilityEnabled: true});
		const result = harness.render(BaseCheckbox, {localize: true, label: 'enabled.label', helperText: 'enabled.helper', onChange: changed});
		const input = result.query('input[type="checkbox"]');
		const helper = result.query('.MuiFormHelperText-root');
		expect(result.container.textContent).toContain('Enabled');
		expect(input.getAttribute('aria-describedby')).toBe(helper.id);
		harness.click(input);
		expect(changed.calls.mostRecent().args[0]).toBeTrue();
	});

	it('labels radio groups, localizes options, and reports selected values', () => {
		const changed = jasmine.createSpy('changed');
		harness = createTestHarness().withContext({localize, localizationEnabled: true, accessibilityEnabled: true});
		const result = harness.render(BaseRadioButtons, {
			localize: true, label: 'choice.label', helperText: 'mode.helper', value: 'first', onChange: changed,
			options: [{value: 'first', label: 'choice.first'}, {value: 'second', label: 'choice.second'}],
		});
		const group = result.query('[role="radiogroup"]');
		expect(group.getAttribute('aria-labelledby')).toBeTruthy();
		expect(result.container.textContent).toContain('First');
		harness.click(result.queryAll('input[type="radio"]')[1]);
		expect(changed.calls.mostRecent().args[0]).toBe('second');
	});

	it('covers component text fallbacks and an unavailable translation service', () => {
		harness = createTestHarness();
		let result = harness.render(TextProbe, {value: null, fallback: 'Fallback'});
		expect(result.container.textContent).toBe('Fallback');
		result = result.rerender({value: 42});
		expect(result.container.textContent).toBe('42');
		harness.unmount();
		harness = createTestHarness().withContext({localizationEnabled: true, localize: null});
		result = harness.render(TextProbe, {localize: true, value: 'missing'});
		expect(result.container.textContent).toBe('');
	});

	it('covers empty and explicitly configured select states', () => {
		harness = createTestHarness().withContext({accessibilityEnabled: false});
		let result = harness.render(BaseSelect, {id: 'plain-select', label: 'Mode', ariaLabel: 'Ignored', fullWidth: false});
		const combobox = result.query('[role="combobox"]');
		expect(combobox.getAttribute('aria-label')).toBeNull();
		expect(result.query('.MuiFormHelperText-root')).toBeNull();
		harness.unmount();
		harness = createTestHarness().withContext({accessibilityEnabled: true});
		result = harness.render(BaseSelect, {
			id: 'labelled-select', label: 'Mode', ariaLabel: 'Mode picker', value: '',
			options: [{value: 'disabled', label: 'Disabled', disabled: true}],
		});
		expect(result.query('[role="combobox"]').getAttribute('aria-label')).toBe('Mode picker');
	});

	it('covers checkbox defaults, explicit slots, and no callback behavior', () => {
		harness = createTestHarness().withContext({accessibilityEnabled: false});
		let result = harness.render(BaseCheckbox, {id: 'plain-check', label: 'Check', ariaLabel: 'Ignored', checked: true, fullWidth: false});
		let input = result.query('input');
		expect(input.checked).toBeTrue();
		expect(input.getAttribute('aria-label')).toBeNull();
		harness.click(input);
		harness.unmount();
		harness = createTestHarness().withContext({accessibilityEnabled: true});
		result = harness.render(BaseCheckbox, {
			label: 'Check', ariaLabel: 'Explicit check', helperText: 'Help',
			checkboxProps: {slotProps: {input: {'data-source': 'configured'}}},
		});
		input = result.query('input');
		expect(input.getAttribute('aria-label')).toBe('Explicit check');
		expect(input.getAttribute('data-source')).toBe('configured');
	});

	it('covers radio defaults, row layout, disabled options, and optional callback behavior', () => {
		harness = createTestHarness().withContext({accessibilityEnabled: false});
		let result = harness.render(BaseRadioButtons, {id: 'plain-radios', label: 'Choice', ariaLabel: 'Ignored'});
		let group = result.query('[role="radiogroup"]');
		expect(group.getAttribute('aria-labelledby')).toBeNull();
		expect(result.query('.MuiFormHelperText-root')).toBeNull();
		harness.unmount();
		harness = createTestHarness().withContext({accessibilityEnabled: true});
		result = harness.render(BaseRadioButtons, {
			label: 'Choice', ariaLabel: 'Choice group', row: true, value: 'one',
			options: [{value: 'one', label: 'One'}, {value: 'two', label: 'Two', disabled: true}],
		});
		group = result.query('[role="radiogroup"]');
		expect(group.getAttribute('aria-label')).toBe('Choice group');
		harness.click(result.queryAll('input[type="radio"]')[0]);
		expect(result.queryAll('input[type="radio"]')[1].disabled).toBeTrue();
	});
});
