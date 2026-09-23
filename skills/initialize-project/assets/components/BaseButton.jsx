import React, {Component} from 'react';
import Button from '@mui/material/Button';
import AppContext from '../common/AppContext.js';
import {resolveComponentText} from './component-text.js';

/** MUI button building block with opt-in localization and authored accessibility labels. */
export default class BaseButton extends Component {
	static contextType = AppContext;

	/**
	 * Called by the component to resolve literal or localized display text.
	 *
	 * @param {unknown} value - The configured text value or phrase key.
	 * @param {string} fallback - The text returned when the value is absent.
	 * @returns {string} - The resolved button text.
	 */
	resolve(value, fallback = '') {
		return resolveComponentText(this.context, this.props.localize ?? false, value, fallback);
	}

	/**
	 * Call this method to render the configured MUI button.
	 *
	 * @returns {React.ReactNode} - The button presentation.
	 */
	render() {
		const {label, ariaLabel, localize, children, priority = 'secondary', selected = false, ...props} = this.props;
		return (
			<Button
				{...props}
				type={props.type || 'button'}
				variant={priority === 'primary' ? 'contained' : 'outlined'}
				aria-label={this.context.accessibilityEnabled && ariaLabel ? this.resolve(ariaLabel) : undefined}
				aria-pressed={this.context.accessibilityEnabled && selected ? 'true' : undefined}
			>
				{children ?? this.resolve(label)}
			</Button>
		);
	}
}
