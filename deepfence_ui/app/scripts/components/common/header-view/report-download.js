/* eslint-disable react/no-access-state-in-setstate */
/* eslint-disable react/destructuring-assignment */
import React from 'react';
import {connect} from 'react-redux';
import {reportDownloadAction} from '../../../actions/app-actions';
import DownloadReportForm from './report-download-form';
import HorizontalLoader from '../app-loader/horizontal-dots-loader';

class DownloadReport extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      showMenu: true,
    };
    this.toggleMenu = this.toggleMenu.bind(this);
    this.getReport = this.getReport.bind(this);
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    const {loading: loadingNew} = newProps;
    const {loading: loadingCurrent} = this.props;
    if (loadingCurrent !== loadingNew && !loadingNew) {
      this.setState({
        showMenu: false,
      });
    }
  }


  toggleMenu() {
    this.setState({
      showMenu: !this.state.showMenu,
    });
  }

  getReport(valuesIm) {
    const {dispatch} = this.props;
    const values = valuesIm.toJS();
    const modifiedValues = Object.keys(values).reduce((acc, key) => {
      const value = values[key];
      acc[key] = value.value || value;
      return acc;
    }, {});
    dispatch(reportDownloadAction(modifiedValues));
  }

  render() {
    const {
      loading = false,
    } = this.props;
    return (
      <div className="df-select col">
        <div className="download-menu">
          {loading && (
          <div className="loader">
            <HorizontalLoader style={{left: '45%', top: '70%'}} />
          </div>
          )}
          <div className="menu-title pb-2">
            Download Summary Report
          </div>
          <div className="w-100" />
          <DownloadReportForm
            onSubmit={this.getReport}
          />
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  loading: state.getIn(['report_download', 'loading']),
});

export default connect(mapStateToProps)(DownloadReport);
