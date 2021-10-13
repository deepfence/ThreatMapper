/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';

import { isEqual } from 'lodash';

import SemiDonutChart from '../../common/charts/semi-donut-chart/index';
import { getDonutDetails } from '../../../utils/web-api-utils';
import { legendEdgeCaseCheck } from '../../../utils/visualization-utils';
import {
  resetDonutStoreStates,
  setActiveDonut,
} from '../../../actions/app-actions';
import { getPodNamespace } from '../../../utils/topology-utils';
import { getHostNameWithoutSemicolon } from '../../../utils/string-utils';

function getOrderedData(donutType, data) {
  const severityOrder = ['critical', 'high', 'medium', 'low'];
  const anomalyOrder = [
    'network_anomaly',
    'behavioral_anomaly',
    'system_audit',
    'syscall_anomaly',
  ];
  const result = {};
  if (donutType === 'severity') {
    severityOrder.forEach(function (item) {
      for (let key in data) {
        if (item == key) {
          result[key] = data[key];
        }
      }
    });
  } else if (donutType === 'anomaly') {
    anomalyOrder.forEach(function (item) {
      for (let key in data) {
        if (item == key) {
          result[key] = data[key];
        }
      }
    });
  }
  return result;
}

function getDonutLegendsFormat(donutType, metaData) {
  const donutMetaData = getOrderedData(donutType, metaData);
  let donutDataFormat = {};
  const donutData = [];
  donutDataFormat['donut_name'] = donutType;
  for (const key in donutMetaData) {
    donutData.push({
      key_name: key,
      key_value: donutMetaData[key],
      isChecked: true,
    });
  }
  donutDataFormat['donut_details'] = donutData;
  return donutDataFormat;
}

function getDonutDataFormat(donutType, metaData) {
  const donutMetaData = getOrderedData(donutType, metaData);
  let donutDataFormat = {};
  const donutData = [];
  donutDataFormat['donut_name'] = donutType;
  for (const key in donutMetaData) {
    donutData.push({
      key_name: key,
      key_value: donutMetaData[key],
      isVisible: true,
    });
  }
  donutDataFormat['donut_details'] = donutData;
  return donutDataFormat;
}

class DonutView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    this.handleSingleClick = this.handleSingleClick.bind(this);
    this.handleDoubleClick = this.handleDoubleClick.bind(this);

    this.initializeLegends = this.initializeLegends.bind(this);
    this.initializeDonuts = this.initializeDonuts.bind(this);

    this.updateDonutOnSingleClick = this.updateDonutOnSingleClick.bind(this);
    this.updateDonutOnDoubleClick = this.updateDonutOnDoubleClick.bind(this);
    this.handleSemiDonutClick = this.handleSemiDonutClick.bind(this);
  }

  componentDidMount() {
    // Initial api call to get the data
    if (
      this.props.activeTopology &&
      (this.props.activeTopology == 'containers' ||
        this.props.activeTopology == 'hosts' ||
        this.props.activeTopology == 'pods')
    ) {
      this.callDonutApi();
    }

    // If data is present then update the view
    if (this.props.severityDonutDetails && this.props.anomalyDonutDetails) {
      let params = {
        severityData: this.props.severityDonutDetails,
        anomalyData: this.props.anomalyDonutDetails,
      };
      if (
        this.props.activeTopology == 'containers' ||
        this.props.activeTopology == 'hosts' ||
        this.props.activeTopology == 'pods'
      ) {
        this.updateDonutView(params);
      }
    }

  }

  UNSAFE_componentWillReceiveProps(newProps) {
    if (
      newProps.refreshInterval &&
      this.props.refreshInterval != newProps.refreshInterval
    ) {
      let interval = setInterval(() => {
        this.callDonutApi();
      }, newProps.refreshInterval.value * 1000);
      if (this.state.intervalObj) {
        clearInterval(this.state.intervalObj);
      }
      this.setState({ intervalObj: interval });
    } else if (
      newProps.days != this.props.days ||
      newProps.activeContainer != this.props.activeContainer ||
      newProps.activeTopology != this.props.activeTopology ||
      newProps.activeHost != this.props.activeHost ||
      newProps.activePod != this.props.activePod
    ) {
      if (
        newProps.activeTopology == 'containers' ||
        newProps.activeTopology == 'hosts' ||
        this.props.activeTopology == 'pods'
      ) {
        this.callDonutApi(
          newProps.activeContainer,
          newProps.activePod,
          newProps.activeHost,
          newProps.activeTopology,
          newProps.days.value.number,
          newProps.days.value.time_unit,
          newProps.podNamespace
        );
      }
    } else if (
      !isEqual(
        newProps.severityDonutDetails,
        this.props.severityDonutDetails
      ) ||
      !isEqual(newProps.anomalyDonutDetails, this.props.anomalyDonutDetails)
    ) {
      let params = {
        severityData: newProps.severityDonutDetails,
        anomalyData: newProps.anomalyDonutDetails,
      };
      if (
        newProps.activeTopology == 'containers' ||
        newProps.activeTopology == 'hosts' ||
        this.props.activeTopology == 'pods'
      ) {
        this.updateDonutView(params);
      }
    }
  }

  componentWillUnmount() {
    // Clearing the intervals
    this.setState({
      severityDonutData: undefined,
      severityLegends: undefined,
      anomalyDonutData: undefined,
      anomalyLegends: undefined,
    });
    // Resetting component states
    if (this.state.intervalObj) {
      clearInterval(this.state.intervalObj);
    }
    // Resetting donut store states.
    this.props.dispatch(resetDonutStoreStates());
  }

  callDonutApi(
    activeContainer,
    activePod,
    activeHost,
    activeTopology,
    number,
    timeUnit,
    podNamespace
  ) {
    let params = {
      active_container: activeContainer || this.props.activeContainer,
      active_pod: activePod || this.props.activePod,
      active_host: activeHost || this.props.activeHost,
      destination_ip: this.props.destinationIp,
      local_network: this.props.localNetworkIp,
      container_id: this.props.containerId,
      active_topology: activeTopology || this.props.activeTopology,
      number: number || this.props.days.value.number,
      time_unit: timeUnit || this.props.days.value.time_unit,
      pod_namespace: podNamespace || this.props.podNamespace,
    };
    getDonutDetails(this.props.dispatch, 'severity', params);
    getDonutDetails(this.props.dispatch, 'anomaly', params);
  }

  updateDonutView(params) {
    // Severity donut
    this.initializeLegends(
      getDonutLegendsFormat('severity', params.severityData)
    );
    this.initializeDonuts(getDonutDataFormat('severity', params.severityData));

    // Anomaly donut
    this.initializeLegends(
      getDonutLegendsFormat('anomaly', params.anomalyData)
    );
    this.initializeDonuts(getDonutDataFormat('anomaly', params.anomalyData));
  }

  initializeLegends(donutLegendsDetails) {
    if (donutLegendsDetails.donut_name === 'severity') {
      this.setState({ severityLegends: donutLegendsDetails.donut_details });
    } else if (donutLegendsDetails.donut_name === 'anomaly') {
      this.setState({ anomalyLegends: donutLegendsDetails.donut_details });
    }
  }

  initializeDonuts(donutData) {
    if (donutData.donut_name === 'severity') {
      this.setState({ severityDonutData: donutData });
    } else if (donutData.donut_name === 'anomaly') {
      this.setState({ anomalyDonutData: donutData });
    }
  }

  // Donut legends single click handler
  handleSingleClick(value) {
    this.updateDonutOnSingleClick(value);
  }

  // Donut legends double click handler
  handleDoubleClick(value) {
    this.updateDonutOnDoubleClick(value);
  }

  // Method to update donut on legend single click
  updateDonutOnSingleClick(selectedSector) {
    if (Object.keys(selectedSector)[0] === 'severity') {
      let activeDonutData = JSON.parse(
        JSON.stringify(this.state.severityDonutData)
      );
      activeDonutData.donut_details.forEach(availableSector => {
        if (
          availableSector.key_name ===
          selectedSector[Object.keys(selectedSector)[0]]
        ) {
          if (availableSector.isVisible) {
            availableSector.isVisible = false;
          } else {
            availableSector.isVisible = true;
          }
        }
      });
      this.setState({ severityDonutData: activeDonutData });

      let activeDonutLegends = JSON.parse(
        JSON.stringify(this.state.severityLegends)
      );
      activeDonutLegends.forEach(selectedLegend => {
        if (
          selectedSector[Object.keys(selectedSector)[0]] ===
          selectedLegend.key_name
        ) {
          if (selectedLegend.isChecked) {
            selectedLegend.isChecked = false;
          } else {
            selectedLegend.isChecked = true;
          }
        }
      });
      this.setState({ severityLegends: activeDonutLegends });

      const isEdgeCase = legendEdgeCaseCheck(
        JSON.parse(JSON.stringify(this.state.severityDonutData.donut_details))
      );
      if (isEdgeCase) {
        this.initializeDonuts(
          getDonutDataFormat('severity', this.props.severityDonutDetails)
        );
        this.initializeLegends(
          getDonutLegendsFormat('severity', this.props.severityDonutDetails)
        );
      }
    } else if (Object.keys(selectedSector)[0] === 'anomaly') {
      let activeDonutData = JSON.parse(
        JSON.stringify(this.state.anomalyDonutData)
      );
      activeDonutData.donut_details.forEach(availableSector => {
        if (
          availableSector.key_name ===
          selectedSector[Object.keys(selectedSector)[0]]
        ) {
          if (availableSector.isVisible) {
            availableSector.isVisible = false;
          } else {
            availableSector.isVisible = true;
          }
        }
      });
      this.setState({ anomalyDonutData: activeDonutData });

      let activeDonutLegends = JSON.parse(
        JSON.stringify(this.state.anomalyLegends)
      );
      activeDonutLegends.forEach(selectedLegend => {
        if (
          selectedSector[Object.keys(selectedSector)[0]] ===
          selectedLegend.key_name
        ) {
          if (selectedLegend.isChecked) {
            selectedLegend.isChecked = false;
          } else {
            selectedLegend.isChecked = true;
          }
        }
      });
      this.setState({ anomalyLegends: activeDonutLegends });

      const isEdgeCase = legendEdgeCaseCheck(
        JSON.parse(JSON.stringify(this.state.anomalyDonutData.donut_details))
      );
      if (isEdgeCase) {
        this.initializeDonuts(
          getDonutDataFormat('anomaly', this.props.anomalyDonutDetails)
        );
        this.initializeLegends(
          getDonutLegendsFormat('anomaly', this.props.anomalyDonutDetails)
        );
      }
    }
  }

  // Method to update donut on legend double click
  updateDonutOnDoubleClick(selectedSector) {
    if (Object.keys(selectedSector)[0] === 'severity') {
      let activeDonutData = JSON.parse(
        JSON.stringify(this.state.severityDonutData)
      );
      activeDonutData.donut_details.forEach(availableSector => {
        if (
          availableSector.key_name ===
          selectedSector[Object.keys(selectedSector)[0]]
        ) {
          availableSector.isVisible = true;
        } else {
          availableSector.isVisible = false;
        }
      });
      this.setState({ severityDonutData: activeDonutData });

      let activeDonutLegends = JSON.parse(
        JSON.stringify(this.state.severityLegends)
      );
      activeDonutLegends.forEach(selectedLegend => {
        if (
          selectedSector[Object.keys(selectedSector)[0]] ===
          selectedLegend.key_name
        ) {
          selectedLegend.isChecked = true;
        } else {
          selectedLegend.isChecked = false;
        }
      });
      this.setState({ severityLegends: activeDonutLegends });
    } else if (Object.keys(selectedSector)[0] === 'anomaly') {
      let activeDonutData = JSON.parse(
        JSON.stringify(this.state.anomalyDonutData)
      );
      activeDonutData.donut_details.forEach(availableSector => {
        if (
          availableSector.key_name ===
          selectedSector[Object.keys(selectedSector)[0]]
        ) {
          availableSector.isVisible = true;
        } else {
          availableSector.isVisible = false;
        }
      });
      this.setState({ anomalyDonutData: activeDonutData });

      let activeDonutLegends = JSON.parse(
        JSON.stringify(this.state.anomalyLegends)
      );
      activeDonutLegends.forEach(selectedLegend => {
        if (
          selectedSector[Object.keys(selectedSector)[0]] ===
          selectedLegend.key_name
        ) {
          selectedLegend.isChecked = true;
        } else {
          selectedLegend.isChecked = false;
        }
      });
      this.setState({ anomalyLegends: activeDonutLegends });
    }
  }

  handleSemiDonutClick(section) {
    const {
      nodeName,
      hostName,
      podNamespace,
      activePod,
      destinationIp,
      localNetworkIp,
      containerId,
      topologyType,
      dispatch,
    } = this.props;

    const ipArr = [];
    ipArr.push(destinationIp);
    ipArr.push(localNetworkIp);

    const severityArr = [section.label];

    dispatch(
      setActiveDonut(
        severityArr,
        'severity',
        nodeName,
        hostName,
        podNamespace,
        activePod,
        topologyType,
        ipArr,
        containerId
      )
    );
  }

  getSeverityDonutView() {
    const { podNamespace, activePod } = this.props;

    const { severityDonutDetails: rawData = {} } = this.props;
    console.log('alerts mini data', rawData);

    return (
      <div className="donut-wrapper">
        <SemiDonutChart
          data={rawData}
          title="Alert Severity"
          chartHeight={200}
          chartWidth={340}
          innerRadius={0.8}
          onSectionClick={this.handleSemiDonutClick}
        />
      </div>
    );
  }

  getDonutEmptyState(donut_data, title) {
    return '';
  }

  isDonutDataAvailable(donut_data) {
    let result;
    if (donut_data && donut_data.length > 0) {
      result = true;
    } else {
      result = false;
    }
    return result;
  }

  render() {
    const { severityDonutData, anomalyDonutData } = this.state;
    const { severityDonutDetails } = this.props;
    return (
      <div>
        {(this.isDonutDataAvailable(severityDonutDetails) ||
          this.isDonutDataAvailable(anomalyDonutData)) &&
          this.props.activeTopology == 'hosts' && (
            <div className="node-details-content-section-header">Alerts</div>
          )}
        {this.props.activeTopology == 'containers' && (
          <div className="node-details-content-section-header">Integrity</div>
        )}
        {this.isDonutDataAvailable(severityDonutDetails)
          ? this.getSeverityDonutView()
          : this.getDonutEmptyState(severityDonutData, 'severity')}
      </div>
    );
  }
}

function mapStateToProps(state) {
  const currentTopologyId = state.get('currentTopologyId');
  const nodeDetails = state.get('nodeDetails').last().details || {};
  let activePod, activeContainer, activeHost, podNamespace;
  if (currentTopologyId === 'pods') {
    activePod = nodeDetails.label;
    podNamespace = getPodNamespace(nodeDetails);
  } else if (currentTopologyId === 'containers') {
    activeHost = nodeDetails.labelMinor;
    activeContainer = nodeDetails.label;
  } else if (currentTopologyId === 'hosts') {
    activeHost = getHostNameWithoutSemicolon(nodeDetails.id);
  }
  return {
    severityDonutDetails: state.get('severityDonutDetails'),
    anomalyDonutDetails: state.get('anomalyDonutDetails'),
    nodeSeverity: state.get('nodeSeverity'),

    days: state.get('alertPanelHistoryBound'),
    refreshInterval: state.get('refreshInterval'),

    activeContainer,
    activeHost,
    activePod,
    podNamespace,
    nodeDetails: state.get('nodeDetails').last().details,
    activeTopology: state.get('currentTopologyId'),
  };
}

export default connect(mapStateToProps)(DonutView);
