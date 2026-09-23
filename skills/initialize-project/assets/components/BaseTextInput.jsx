import React, {Component} from 'react';
import TextField from '@mui/material/TextField';
import AppContext from '../common/AppContext.js';
import {resolveComponentText} from './component-text.js';

let nextTextInputId = 1;

/** MUI text-input building block with opt-in localization and accessibility metadata. */
export default class BaseTextInput extends Component {
	static contextType = AppContext;

	/**
	 * Creates a text input with a stable fallback identifier.
	 *
	 * @param {object} props - The initial React properties.
	 */
	constructor(props) {
		super(props);
		this.fallbackId = `text-input-${nextTextInputId++}`;
	}

	/**
	 * Called by the component to resolve display text.
	 *
	 * @param {unknown} value - The value or phrase key.
	 * @param {string} fallback - The absent-value fallback.
	 * @returns {string} - The resolved text.
	 */
	resolve(value, fallback = '') {
		return resolveComponentText(this.context, this.props.localize ?? false, value, fallback);
	}

	/**
	 * Call this method to render the configured text input.
	 *
	 * @returns {React.ReactNode} - The text-input presentation.
	 */
	render() {
		const {id, label, helperText, ariaLabel, localize, slotProps, ...props} = this.props;
		const resolvedAriaLabel = this.context.accessibilityEnabled && ariaLabel ? this.resolve(ariaLabel) : undefined;
		return (
			<TextField
				{...props}
				id={id || this.fallbackId}
				label={this.resolve(label)}
				helperText={this.resolve(helperText) || undefined}
				fullWidth={props.fullWidth ?? true}
				slotProps={{...slotProps, htmlInput: {...slotProps?.htmlInput, ...(resolvedAriaLabel ? {'aria-label': resolvedAriaLabel} : {})}}}
			/>
		);
	}
}
