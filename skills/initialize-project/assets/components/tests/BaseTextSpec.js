import React from 'react';
import BaseText from '../BaseText.jsx';
import Text from '../Text.jsx';
import {createTestHarness} from '../../testing/TestHarness.js';

describe('BaseText and Text', () => {
	let harness;
	const localize = {translate: jasmine.createSpy('translate').and.callFake((phrase, replacements, cardinal) => phrase === 'welcome' ? `Hello ${replacements.name}:${cardinal}` : '<strong>Trusted</strong>')};
	beforeEach(() => localize.translate.calls.reset());
	afterEach(() => harness?.unmount());

	it('renders literal values without invoking localization', () => {
		harness = createTestHarness().withContext({localize, localizationEnabled: true});
		const result = harness.render(BaseText, {value: 'Literal'});
		expect(result.container.textContent).toBe('Literal');
		expect(localize.translate).not.toHaveBeenCalled();
	});

	it('passes phrase arguments through the concrete Text component', () => {
		harness = createTestHarness().withContext({localize, localizationEnabled: true});
		const result = harness.render(Text, {phrase: 'welcome', replacements: {name: 'Ada'}, cardinal: 2});
		expect(result.container.textContent).toBe('Hello Ada:2');
		expect(localize.translate).toHaveBeenCalledWith('welcome', {name: 'Ada'}, 2, 'en-US', false);
	});

	it('renders trusted HTML only when explicitly enabled', () => {
		harness = createTestHarness().withContext({localize, localizationEnabled: true});
		let result = harness.render(Text, {phrase: 'html'});
		expect(result.container.querySelector('strong')).toBeNull();
		result = result.rerender({html: true});
		expect(result.container.querySelector('strong').textContent).toBe('Trusted');
	});

	it('supports semantic element props and suppresses empty text', () => {
		harness = createTestHarness();
		let result = harness.render(BaseText, {as: 'p', value: 'Paragraph', id: 'copy'});
		expect(result.query('p#copy').textContent).toBe('Paragraph');
		result = result.rerender({value: ''});
		expect(result.container.children.length).toBe(0);
	});

	it('covers disabled localization, phrase fallback, and a missing localization service', () => {
		harness = createTestHarness().withContext({localizationEnabled: false});
		let result = harness.render(BaseText, {localize: true, phrase: 'Literal phrase'});
		expect(result.query('span').textContent).toBe('Literal phrase');
		harness.unmount();
		harness = createTestHarness().withContext({localizationEnabled: true, localize: null});
		result = harness.render(BaseText, {localize: true, value: 'missing-service'});
		expect(result.container.children.length).toBe(0);
		harness.unmount();
		harness = createTestHarness().withContext({localizationEnabled: true, localize});
		result = harness.render(BaseText, {localize: true, value: 'html'});
		expect(result.container.textContent).toBe('<strong>Trusted</strong>');
		result = result.rerender({localize: false, value: undefined, phrase: undefined});
		expect(result.container.children.length).toBe(0);
	});
});
