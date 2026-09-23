import React, {Component} from 'react';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import AppContext from '../common/AppContext.js';
import {resolveComponentText} from './component-text.js';

let nextRadioGroupId = 1;

/** MUI radio-group building block with opt-in localization and accessibility metadata. */
export default class BaseRadioButtons extends Component {
	static contextType = AppContext;

	/**
	 * Creates a radio group with a stable fallback identifier.
	 *
	 * @param {object} props - The initial React properties.
	 */
	constructor(props) { super(props); this.fallbackId = `radio-group-${nextRadioGroupId++}`; }
	/**
	 * Called by the component to resolve display text.
	 *
	 * @param {unknown} value - The value or phrase key.
	 * @param {string} fallback - The absent-value fallback.
	 * @returns {string} - The resolved text.
	 */
	resolve(value, fallback = '') { return resolveComponentText(this.context, this.props.localize ?? false, value, fallback); }
	/**
	 * Called by MUI when the selected radio changes.
	 *
	 * @param {React.ChangeEvent<HTMLInputElement>} event - The originating input event.
	 */
	handleChange(event) { this.props.onChange?.(event.target.value, event); }
	/**
	 * Called by the group to render one radio option.
	 *
	 * @param {object} option - The option configuration.
	 * @returns {React.ReactNode} - The radio option.
	 */
	renderOption(option) { return <FormControlLabel key={option.value} value={option.value} disabled={option.disabled} control={<Radio />} label={this.resolve(option.label)} />; }
	/**
	 * Call this method to render the configured radio group.
	 *
	 * @returns {React.ReactNode} - The radio-group presentation.
	 */
	render() {
		const {id, label, helperText, ariaLabel, localize, options = [], onChange, value, row = false, ...props} = this.props;
		const groupId = id || this.fallbackId;
		const helperId = helperText ? `${groupId}-helper` : undefined;
		return <FormControl {...props}><FormLabel id={`${groupId}-label`}>{this.resolve(label)}</FormLabel><RadioGroup value={value} row={row} onChange={(event) => this.handleChange(event)} aria-labelledby={this.context.accessibilityEnabled ? `${groupId}-label` : undefined} aria-describedby={this.context.accessibilityEnabled ? helperId : undefined} aria-label={this.context.accessibilityEnabled && ariaLabel ? this.resolve(ariaLabel) : undefined}>{options.map((option) => this.renderOption(option))}</RadioGroup>{helperText ? <FormHelperText id={helperId}>{this.resolve(helperText)}</FormHelperText> : null}</FormControl>;
	}
}
