import React, {Component} from 'react';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import AppContext from '../common/AppContext.js';
import {resolveComponentText} from './component-text.js';

let nextCheckboxId = 1;

/** MUI checkbox building block with opt-in localization and accessibility metadata. */
export default class BaseCheckbox extends Component {
	static contextType = AppContext;

	/**
	 * Creates a checkbox with a stable fallback identifier.
	 *
	 * @param {object} props - The initial React properties.
	 */
	constructor(props) { super(props); this.fallbackId = `checkbox-${nextCheckboxId++}`; }
	/**
	 * Called by the component to resolve literal or localized display text.
	 *
	 * @param {unknown} value - The configured text value or phrase key.
	 * @param {string} fallback - The text returned when the value is absent.
	 * @returns {string} - The resolved checkbox text.
	 */
	resolve(value, fallback = '') { return resolveComponentText(this.context, this.props.localize ?? false, value, fallback); }
	/**
	 * Called by the MUI input when its checked state changes.
	 *
	 * @param {React.ChangeEvent<HTMLInputElement>} event - The originating input event.
	 */
	handleChange(event) { this.props.onChange?.(event.target.checked, event); }
	/**
	 * Called by the component to render the configured checkbox input.
	 *
	 * @param {string} checkboxId - The stable checkbox identifier.
	 * @param {string | undefined} helperId - The optional helper-text identifier.
	 * @returns {React.ReactNode} - The checkbox input.
	 */
	renderCheckbox(checkboxId, helperId) {
		const {ariaLabel, checked = false, checkboxProps = {}} = this.props;
		return <Checkbox {...checkboxProps} id={checkboxId} checked={checked} onChange={(event) => this.handleChange(event)} slotProps={{...checkboxProps.slotProps, input: {...checkboxProps.slotProps?.input, ...(this.context.accessibilityEnabled && helperId ? {'aria-describedby': helperId} : {}), ...(this.context.accessibilityEnabled && ariaLabel ? {'aria-label': this.resolve(ariaLabel)} : {})}}} />;
	}
	/** Call this method to render the checkbox and its labels. */
	render() {
		const {id, label, helperText, ariaLabel, localize, checked, onChange, checkboxProps, ...props} = this.props;
		const checkboxId = id || this.fallbackId;
		const helperId = helperText ? `${checkboxId}-helper` : undefined;
		return <FormControl {...props} fullWidth={props.fullWidth ?? true}><FormControlLabel label={this.resolve(label)} control={this.renderCheckbox(checkboxId, helperId)} />{helperText ? <FormHelperText id={helperId}>{this.resolve(helperText)}</FormHelperText> : null}</FormControl>;
	}
}
