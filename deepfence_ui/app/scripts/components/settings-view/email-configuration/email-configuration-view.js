/* eslint-disable */
// React imports
import React from 'react';
import { connect } from 'react-redux';

// Custom component imports
import DFSelect from '../../common/multi-select/app';
import EmailConfigurationTableView from '../../common/email-configuration-table-view/email-configuration-table-view';

import {
	deleteMailConfigurationsAction,
	getAllMailConfigurationsAction,
	addMailConfigurationAction,
	showModal,
} from '../../../actions/app-actions';
import AppLoader from '../../common/app-loader/app-loader';
import { NO_MAIL_CONFIGURATIONS_MESSAGE } from '../../../constants/visualization-config';

const resourceCollection = [
	{
		name: 'Google SMTP',
		value: 'smtp',
	},
	{
		name: 'Amazon SES',
		value: 'amazon_ses',
	},
	{
		name: 'SMTP',
		value: 'simple_smtp',
	},
];

class EmailConfiguration extends React.Component {
	constructor() {
		super();
		this.state = {
			emailProvider: {
				value: 'smtp',
				label: 'Google SMTP',
			},
			isSuccess: false,
			isError: false,
			submitted: false,
		};
		this.handleChange = this.handleChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
		this.handleResourceChange = this.handleResourceChange.bind(this);
		this.deleteMailConfiguration = this.deleteMailConfiguration.bind(this);
		this.handleDeleteDialog = this.handleDeleteDialog.bind(this);
	}

	componentDidMount() {
		this.fetchMailConfigurationList();
	}

	fetchMailConfigurationList() {
		this.props.dispatch(getAllMailConfigurationsAction());
	}

	handleChange(e) {
		const { name, value } = e.target;
		this.setState({ [name]: value });
	}

	handleResourceChange(e) {
		this.setState({
			emailProvider: e,
		});
	}

	handleSubmit(e) {
		e.preventDefault();
		this.setState({ submitted: true });
		const {
			emailProvider,
			email_smtp,
			password,
			port,
			smtp,
			ses_region,
			amazon_access_key,
			amazon_secret_key,
			email_ses,
		} = this.state;
		let params;
		let flag = true;

		if (emailProvider.value === 'smtp' || emailProvider.value === 'simple_smtp') {
			params = {
				email_provider: emailProvider.value,
				email: email_smtp,
				smtp: smtp,
				port: port,
				password: password,
			};
		}
		
		if (emailProvider.value === 'simple_smtp') {
			params = {
				email_provider: 'smtp',
				email: email_smtp,
				smtp: smtp,
				port: port,
				password: password,
			};
		}

		if (emailProvider.value === 'amazon_ses') {
			params = {
				email_provider: emailProvider.value,
				email: email_ses,
				amazon_access_key: amazon_access_key,
				amazon_secret_key: amazon_secret_key,
				ses_region: ses_region,
			};
		}
		Object.keys(params).map(k => { if(!params[k] || params[k] == '') flag = false } )
		flag && this.props.dispatch(addMailConfigurationAction(params));
		setTimeout(() => {
			this.props.dispatch(getAllMailConfigurationsAction());
		}, 1000);
	}

	getEnabledBtnView() {
		return (
			<button type="button" className="app-btn" onClick={this.handleSubmit}>
				Save changes
			</button>
		);
	}

	EmailConfigurationFormView() {
		const { submitted } = this.state;
		const { addMailConfigurationError } = this.props;
		const columnStyle = {
			padding: '0px 60px',
		};
		return (
			<div className="form-wrapper" style={{paddingTop: '10px'}}>
				<form name="form" style={{ maxWidth: 'unset' }}>
					<div className="container-fluid">
						<div className="row">
							<div className="col-12 col-md-6">
								<div className="" style={{ columnStyle }}>
									<div className="wrapper-heading">
										Choose Mailer Type*
									</div>
									<br/>
									<div className="resource-option-wrapper">
										<div className="df-select-field">
											<DFSelect
												options={resourceCollection.map((el) => ({
													value: el.value,
													label: el.name,
												}))}
												onChange={this.handleResourceChange}
												placeholder="Mailer type"
												value={this.state.emailProvider}
												clearable={false}
											/>
										</div>
									</div>
									<br />
									<div className="row">
										{(this.state.emailProvider.value === 'smtp' || this.state.emailProvider.value === 'simple_smtp' ) && (
											<div className="col-md-6">
												<div
													className={
														'form-group' +
														(submitted && !this.state.email_smtp
															? ' has-error'
															: '')
													}
												>
													<input
														type="text"
														className="form-control"
														name="email_smtp"
														placeholder="Email"
														onChange={this.handleChange}
													/>
													{submitted && !this.state.email_smtp && (
														<div className="field-error">
															Email is required
														</div>
													)}
												</div>
											</div>
										)}
										{(this.state.emailProvider.value === 'smtp' || this.state.emailProvider.value === 'simple_smtp' ) && (
											<div className="col-md-6">
												<div
													className={
														'form-group' +
														(submitted && !this.state.password
															? ' has-error'
															: '')
													}
												>
													<input
														type="password"
														className="form-control"
														name="password"
														placeholder="App password"
														onChange={this.handleChange}
													/>
													{submitted && !this.state.password && (
														<div className="field-error">
															App password is required
														</div>
													)}
												</div>
											</div>
										)}
										{this.state.emailProvider.value ===
											'amazon_ses' && (
											<div className="col">
												<div
													className={
														'form-group' +
														(submitted && !this.state.email_ses
															? ' has-error'
															: '')
													}
												>
													<input
														type="text"
														className="form-control"
														name="email_ses"
														placeholder="Email"
														onChange={this.handleChange}
													/>
													{submitted && !this.state.email_ses && (
														<div className="field-error">
															Email is required
														</div>
													)}
												</div>
											</div>
										)}

										{this.state.emailProvider.value ===
											'amazon_ses' && (
											<div className="col">
												<div
													className={
														'form-group' +
														(submitted && !this.state.ses_region
															? ' has-error'
															: '')
													}
												>
													<input
														type="text"
														className="form-control"
														name="ses_region"
														placeholder="SES region"
														onChange={this.handleChange}
													/>
													{submitted && !this.state.ses_region && (
														<div className="field-error">
															SES region is required
														</div>
													)}
												</div>
											</div>
										)}
									</div>
									<div className="row">
										{(this.state.emailProvider.value === 'smtp' || this.state.emailProvider.value === 'simple_smtp' ) && (
											<div className="col">
												<div
													className={
														'form-group' +
														(submitted && !this.state.smtp
															? ' has-error'
															: '')
													}
												>
													<input
														type="text"
														className="form-control"
														name="smtp"
														placeholder="SMTP server"
														onChange={this.handleChange}
													/>
													{submitted && !this.state.smtp && (
														<div className="field-error">
															SMTP server is required
														</div>
													)}
												</div>
											</div>
										)}

										{(this.state.emailProvider.value === 'smtp' ) && (
											<div className="col">
												<div
													className={
														'form-group' +
														(submitted && !this.state.port
															? ' has-error'
															: '')
													}
												>
													<input
														type="number"
														className="form-control"
														name="port"
														placeholder="Gmail SMTP port (SSL)"
														onChange={this.handleChange}
													/>
													{submitted && !this.state.port && (
														<div className="field-error">
															Gmail SMTP port (SSL) is required
														</div>
													)}
												</div>
											</div>
										)}
										{(this.state.emailProvider.value === 'simple_smtp' ) && (
											<div className="col">
												<div
													className={
														'form-group' +
														(submitted && !this.state.port
															? ' has-error'
															: '')
													}
												>
													<input
														type="number"
														className="form-control"
														name="port"
														placeholder="SMTP port (SSL)"
														onChange={this.handleChange}
													/>
													{submitted && !this.state.port && (
														<div className="field-error">
															SMTP port (SSL) is required
														</div>
													)}
												</div>
											</div>
										)}
										{this.state.emailProvider.value ===
											'amazon_ses' && (
											<div className="col">
												<div
													className={
														'form-group' +
														(submitted &&
														!this.state.amazon_access_key
															? ' has-error'
															: '')
													}
												>
													<input
														type="text"
														className="form-control"
														name="amazon_access_key"
														placeholder="Amazon access key"
														onChange={this.handleChange}
													/>
													{submitted &&
														!this.state.amazon_access_key && (
															<div className="field-error">
																Amazon access key is required
															</div>
														)}
												</div>
											</div>
										)}

										{this.state.emailProvider.value ===
											'amazon_ses' && (
											<div className="col">
												<div
													className={
														'form-group' +
														(submitted &&
														!this.state.amazon_secret_key
															? ' has-error'
															: '')
													}
												>
													<input
														type="text"
														className="form-control"
														name="amazon_secret_key"
														placeholder="Amazon secret key"
														onChange={this.handleChange}
													/>
													{submitted &&
														!this.state.amazon_secret_key && (
															<div className="field-error">
																Amazon secret key is required
															</div>
														)}
												</div>
											</div>
										)}
									</div>
								</div>
								<br />
								<div
									className="form-group col-md-3"
									style={{ paddingLeft: 0 }}
								>
									{this.getEnabledBtnView()}
								</div>
								<div className="error-msg-container">
									{addMailConfigurationError && (
										<div className="message error-message">
											{addMailConfigurationError}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</form>
			</div>
		);
	}

	deleteMailConfiguration(record) {
		const params = {
			id: record.id,
		};
		return this.props.dispatch(deleteMailConfigurationsAction(params));
	}

	handleDeleteDialog(record) {
		const params = {
			dialogTitle: 'Delete mail configuration?',
			dialogBody: 'Are you sure you want to delete this mail configuration?',
			confirmButtonText: 'Yes, Delete',
			cancelButtonText: 'No, Keep',
			onConfirmButtonClick: () => this.deleteMailConfiguration(record),
		};
		this.props.dispatch(showModal('DIALOG_MODAL', params));
	}

	getIntegrationTableView() {
		return (
			<EmailConfigurationTableView
				recordCollection={this.props.mailConfigurationList}
				onDeleteRequestCallback={(record) =>
					this.handleDeleteDialog(record)
				}
			/>
		);
	}

	getTableEmptyState(data) {
		const emptyStateWrapper = {
			height: '400px',
			width: '100%',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
		};
		return (
			<div style={emptyStateWrapper}>
				{data === undefined ? <AppLoader /> : this.getEmptyStateView()}
			</div>
		);
	}

	getEmptyStateView() {
		return (
			<div className="empty-state-wrapper">
				{NO_MAIL_CONFIGURATIONS_MESSAGE.message}
			</div>
		);
	}

	isDataAvailable(data) {
		let result;
		if (data && data.length > 0) {
			result = true;
		} else {
			result = false;
		}
		return result;
	}

	render() {
		const { mailConfigurationList } = this.props;
		return (
			<div className="email-integration-view-wrapper">
				<div className="integration-form-section">
					{this.EmailConfigurationFormView()}
				</div>
				<div
					className="integration-list-section"
					style={{ marginLeft: '-6px' }}
				>
					{this.isDataAvailable(mailConfigurationList)
						? this.getIntegrationTableView()
						: this.getTableEmptyState(mailConfigurationList)}
				</div>
			</div>
		);
	}
}

function mapStateToProps(state) {
	return {
		isSuccess: state.get('isSuccess'),
		isError: state.get('isError'),
		mailConfigurationList: state.get('mail_configurations'),
		addMailConfigurationError: state.get('mail_configurations_error'),
	};
}

export default connect(mapStateToProps)(EmailConfiguration);
