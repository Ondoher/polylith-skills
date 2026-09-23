import React, {Component} from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import AppContext from '../common/AppContext.js';
import {resolveComponentText} from './component-text.js';

let nextDialogId = 1;

/** Generic MUI dialog building block with controller-style child actions and accessible announcements. */
export default class BaseDialog extends Component {
	static contextType = AppContext;

	/**
	 * Creates a dialog with locally mutable presentation state.
	 *
	 * @param {object} props - The initial React properties.
	 */
	constructor(props) {
		super(props);
		this.instanceId = nextDialogId++;
		this.state = makeState(props.title, props.description, props.actions || []);
		this.handleClose = this.handleClose.bind(this);
	}

	/**
	 * Called by React to reset local dialog state when the reset token changes.
	 *
	 * @param {object} previousProps - The properties from the previous render.
	 */
	componentDidUpdate(previousProps) {
		if (previousProps.resetToken !== this.props.resetToken) {
			this.setState(makeState(this.props.title, this.props.description, this.props.actions || []));
		}
	}

	/**
	 * Called by the dialog to resolve literal or localized display text.
	 *
	 * @param {unknown} value - The configured text value or phrase key.
	 * @param {string} fallback - The text returned when the value is absent.
	 * @returns {string} - The resolved dialog text.
	 */
	resolve(value, fallback = '') {
		return resolveComponentText(this.context, this.props.localize ?? false, value, fallback);
	}

	/**
	 * Call this method to obtain the dialog title identifier.
	 *
	 * @returns {string} - The title identifier.
	 */
	getTitleId() {
		return this.props.titleId || `dialog-${this.instanceId}-title`;
	}

	/**
	 * Call this method to obtain the optional dialog description identifier.
	 *
	 * @returns {string | undefined} - The description identifier.
	 */
	getDescriptionId(description) {
		return description ? (this.props.descriptionId || `dialog-${this.instanceId}-description`) : undefined;
	}

	/**
	 * Call this method to replace the displayed title.
	 *
	 * @param {unknown} value - The next literal value or phrase key.
	 */
	setTitle(value) {
		this.setState({title: value});
	}

	/**
	 * Call this method to replace the displayed description.
	 *
	 * @param {unknown} value - The next literal value or phrase key.
	 */
	setDescription(value) {
		this.setState({description: value});
	}

	/**
	 * Call this method to merge presentation state into one configured action.
	 *
	 * @param {string} id - The action identifier to update.
	 * @param {object} patch - The action properties to merge.
	 */
	setActionState(id, patch) {
		this.setState((state) => ({actions: state.actions.map((action) => action.id === id ? {...action, ...patch} : action)}));
	}

	/**
	 * Call this method to publish text through the dialog live region.
	 *
	 * @param {unknown} value - The announcement value or phrase key.
	 */
	announce(value) {
		this.setState({announcement: value});
	}

	/** Called by MUI or the close button to report close intent without owning the workflow. */
	handleClose(_event, reason = 'closeButtonClick') {
		this.props.onClose?.(reason);
		this.props.onAction?.('close');
	}

	/**
	 * Called by an action button to enforce its enabled state and report intent.
	 *
	 * @param {object} action - The configured dialog action.
	 * @param {React.MouseEvent<HTMLButtonElement>} event - The originating button event.
	 */
	handleAction(action, event) {
		if (action.enabled === false) {
			event.preventDefault();
			return;
		}
		if (action.intent === 'cancel') this.props.onCancel?.(action.id);
		if (action.intent === 'confirm') this.props.onConfirm?.(action.id);
		this.props.onAction?.(action.id);
	}

	/** Call this method to create the presentation controller passed to dialog children. @returns {object} - The dialog presentation controller. */
	getController() {
		return {
			setTitle: (value) => this.setTitle(value),
			setDescription: (value) => this.setDescription(value),
			setActionState: (id, patch) => this.setActionState(id, patch),
			announce: (value) => this.announce(value),
			submit: () => { this.props.onConfirm?.('submit'); this.props.onAction?.('submit'); },
		};
	}

	/**
	 * Called by the dialog to render its configured child with the presentation controller.
	 *
	 * @returns {React.ReactNode} - The rendered child content.
	 */
	renderChild() {
		const {children} = this.props;
		const controller = this.getController();
		if (typeof children === 'function') return children(controller);
		return React.isValidElement(children) ? React.cloneElement(children, {dialog: controller}) : children;
	}

	/**
	 * Called by the dialog to render its optional close button.
	 *
	 * @returns {React.ReactNode} - The close button or no content.
	 */
	renderCloseButton() {
		if (!this.props.showClose) return null;
		const closeLabel = this.props.closeLabel ?? (this.props.localize ? 'common.close' : 'Close');
		return <IconButton type="button" aria-label={this.context.accessibilityEnabled ? this.resolve(closeLabel) : undefined} onClick={(event) => this.handleClose(event, 'closeButtonClick')}><CloseIcon /></IconButton>;
	}

	/**
	 * Called by the dialog to render one configured action.
	 *
	 * @param {object} action - The normalized action configuration.
	 * @param {number} index - The stable action position.
	 * @returns {React.ReactNode} - The action button or no content.
	 */
	renderAction(action, index) {
		if (action.hidden) return null;
		const disabled = action.enabled === false;
		return <Button
			key={action.id || `action-${index}`}
			type="button"
			variant={action.priority === 'primary' ? 'contained' : 'outlined'}
			disabled={!this.context.accessibilityEnabled && disabled}
			aria-disabled={this.context.accessibilityEnabled && disabled ? 'true' : undefined}
			aria-pressed={this.context.accessibilityEnabled && action.pressable ? String(action.pressed === true) : undefined}
			onClick={(event) => this.handleAction(action, event)}
		>{this.resolve(action.label)}</Button>;
	}

	/**
	 * Called by the dialog to render its normalized action collection.
	 *
	 * @returns {React.ReactNode} - The action region or no content.
	 */
	renderActions() {
		const actions = normalizeActions(this.state.actions);
		return actions.length ? <DialogActions>{actions.map((action, index) => this.renderAction(action, index))}</DialogActions> : null;
	}

	/**
	 * Call this method to render the configured dialog.
	 *
	 * @returns {React.ReactNode} - The dialog presentation.
	 */
	render() {
		const {open, title, description, actions, children, onAction, onClose, onCancel, onConfirm, localize, resetToken, showClose, closeLabel, titleId, descriptionId, ...props} = this.props;
		const resolvedTitle = this.resolve(this.state.title);
		const resolvedDescription = this.resolve(this.state.description);
		const resolvedTitleId = this.getTitleId();
		const resolvedDescriptionId = this.getDescriptionId(resolvedDescription);
		return (
			<Dialog {...props} open={open} onClose={this.handleClose} aria-labelledby={this.context.accessibilityEnabled ? resolvedTitleId : undefined} aria-describedby={this.context.accessibilityEnabled ? resolvedDescriptionId : undefined}>
				<DialogTitle id={resolvedTitleId}>{resolvedTitle}{this.renderCloseButton()}</DialogTitle>
				<DialogContent>{resolvedDescription ? <p id={resolvedDescriptionId}>{resolvedDescription}</p> : null}{this.renderChild()}</DialogContent>
				{this.renderActions()}
				<div id={`dialog-${this.instanceId}-announcement`} className="screen-reader-only" aria-live={this.context.accessibilityEnabled ? 'polite' : undefined}>{this.resolve(this.state.announcement)}</div>
			</Dialog>
		);
	}
}

/**
 * Call this function to create resettable dialog presentation state.
 *
 * @param {unknown} title - The initial title value or phrase key.
 * @param {unknown} description - The initial description value or phrase key.
 * @param {object[]} actions - The initial action configurations.
 * @returns {object} - The dialog presentation state.
 */
function makeState(title, description, actions) {
	return {title, description, actions, announcement: ''};
}

/**
 * Call this function to validate action identifiers and primary-action precedence.
 *
 * @param {object[]} actions - The configured dialog actions.
 * @returns {object[]} - The normalized action configurations.
 */
function normalizeActions(actions) {
	const ids = new Set();
	let primary = false;
	return actions.reduce((result, action) => {
		if (!action.id || ids.has(action.id)) { console.warn('BaseDialog action ids must be present and unique.'); return result; }
		if (action.id === 'close') { console.warn('BaseDialog action id "close" is reserved.'); return result; }
		ids.add(action.id);
		if (action.priority === 'primary') {
			if (primary) {
				console.warn('BaseDialog supports only one primary action.');
				result.push({...action, priority: 'secondary'});
				return result;
			}
			primary = true;
		}
		result.push(action);
		return result;
	}, []);
}
