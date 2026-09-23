import React, {Component} from 'react';
import FormHelperText from '@mui/material/FormHelperText';
import AppContext from '../common/AppContext.js';
import {resolveComponentText} from './component-text.js';

/** MUI helper-text building block with optional accessible error semantics. */
export default class BaseHelperText extends Component {
	static contextType = AppContext;

	/**
	 * Call this method to render helper text when it has content.
	 *
	 * @returns {React.ReactNode} - The helper text or no content.
	 */
	render() {
		const {label, localize = false, children, status = 'normal', ...props} = this.props;
		const content = children ?? resolveComponentText(this.context, localize, label);
		if (!content) return null;
		const error = status === 'error' || props.error === true;
		return (
			<FormHelperText
				{...props}
				error={error}
				role={this.context.accessibilityEnabled && error ? 'alert' : undefined}
				aria-live={this.context.accessibilityEnabled ? (error ? 'assertive' : 'polite') : undefined}
			>
				{content}
			</FormHelperText>
		);
	}
}
