import React, {Component} from 'react';
import Alert from '@mui/material/Alert';
import AppContext from '../common/AppContext.js';
import {resolveComponentText} from './component-text.js';

/** Form-level MUI feedback message with opt-in localization. */
export default class BaseFormMessage extends Component {
	static contextType = AppContext;

	/**
	 * Call this method to render the configured form message when it has content.
	 *
	 * @returns {React.ReactNode} - The feedback message or no content.
	 */
	render() {
		const {label, localize = false, children, type = 'info', ...props} = this.props;
		const content = children ?? resolveComponentText(this.context, localize, label);
		if (!content) return null;
		return <Alert {...props} severity={props.severity || type} variant={props.variant || 'outlined'}>{content}</Alert>;
	}
}
