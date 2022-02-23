import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Select from 'react-select';
import { Link, withRouter } from 'react-router-dom';
import OutsideClickHandler from 'react-outside-click-handler';

import { isGraphViewModeSelector } from '../selectors/topology';
import {
  addTopologyFilter,
  removeTopologyFilter,
  setTopologyClickedNode,
} from '../actions/app-actions';
import { fetchTopologyData } from './multi-cloud/topology-client';
import TopologyFiltersBar from './topology-filter';

function NodeFiltersPanel(props) {
  // state constants for toggle switchs
  const [showCloudProviderDropdown, setShowCloudProviderDropdown] =
    useState(false);
  const [showChildDropdown, setShowChildDropDown] = useState(false);
  const [optionValues, setOptionValues] = useState([]);
  const [clickedIndexValue, setIndexValue] = useState(0);
  const topologyFilters =
    useSelector(state => state.get('topologyFilters')) || [];
  const dispatch = useDispatch();
  const { apiKey, apiUrl, history } = props;
  let viewType = '';
  const viewUrl = history.location.pathname;

  const filterIds = useMemo(() => {
    const ids = new Set();
    // eslint-disable-next-line no-unused-vars
    for (const filter of topologyFilters) {
      // eslint-disable-next-line no-unused-vars
      for (const obj of filter) {
        ids.add(obj.id);
      }
    }
    return ids;
  }, [topologyFilters]);

  const isGraphViewMode = useSelector(state => isGraphViewModeSelector(state));

  // filters out the pseudo nodes
  const setMenuValues = options => {
    const filteredMenuValue = options.filter(
      obj =>
        obj.pseudo !== true && obj.shape !== 'square' && !filterIds.has(obj.id)
    );
    setOptionValues(filteredMenuValue);
  };

  const renderChildFilterComponent = () => (
    <>
      <TopologyFiltersBar
        filters={topologyFilters}
        clickedIndexValue={clickedIndexValue}
        styles={styles}
        theme={themeCb}
        showChildDropdown={showChildDropdown}
        setShowChildDropDown={setShowChildDropDown}
        handleOnChildFilterChange={onChildFilterSelected}
        addFilter={addChildFilter}
        removeFilter={removeFilter}
        optionValues={optionValues}
        viewUrl={viewUrl}
      />
    </>
  );

  // adds children filter like cloud regions, hosts,
  const addChildFilter = (filterIndex, filter) => {
    const selectedFilter = filter[filter.length - 1];
    setOptionValues([]);
    fetchTopologyData(
      apiUrl,
      apiKey,
      selectedFilter.id,
      viewUrl,
      selectedFilter.label,
      selectedFilter.topo_node_type,
      selectedFilter.topo_children_types[0]
    ).then(data => setMenuValues(data));
    setShowChildDropDown(!showChildDropdown);
    setShowCloudProviderDropdown(false);
    setIndexValue(filterIndex);
  };

  // remove the selected filter
  const removeFilter = filter => {
    dispatch(removeTopologyFilter(filter));

    // setting last element as active node for side panel
    const node = filter.at(-1);
    dispatch(setTopologyClickedNode(node));
  };

  const onChildFilterSelected = (e, filter) => {
    setShowChildDropDown(!showChildDropdown);
    dispatch(addTopologyFilter([...filter, { id: e.id }]));
  };

  const setViewType = () => {
    const url2 = history.location.pathname;
    if (url2.includes('cloud')) {
      viewType = 'CLOUD_PROVIDER';
    } else if (url2.includes('hosts')) {
      viewType = 'HOST';
    } else if (url2.includes('k8s')) {
      viewType = 'KUBERNETES_CLUSTER';
    } else {
      viewType = 'CLOUD_PROVIDER';
    }
  };

  // This can be generic function.
  const addCloudProviderFilter = () => {
    setOptionValues([]);
    setViewType();
    fetchTopologyData(apiUrl, apiKey, null, viewType).then(data => {
      setMenuValues(data);
    });
    setShowCloudProviderDropdown(!showCloudProviderDropdown);
    setShowChildDropDown(false);
  };

  // handles on select option from filter dropdown
  const onCloudProviderFilterSelected = e => {
    dispatch(addTopologyFilter([{ id: e.id }]));
    setShowCloudProviderDropdown(!showCloudProviderDropdown);
  };

  // custom styles for the filters dropdown,
  // as per the Select api docs.
  const styles = {
    option: (provided, state) => ({
      ...provided,
      color: state.isSelected ? '#0080ff' : '#999999',
      backgroundColor: state.isSelected ? '#1c1c1c' : provided.backgroundColor,
      '&:hover': {
        backgroundColor: '#333333',
      },
    }),
    control: provided => ({
      ...provided,
      width: 120,
      borderColor: '#1c1c1c',
    }),
  };

  const themeCb = theme => ({
    ...theme,
    borderRadius: 5,
    colors: {
      ...theme.colors,
      primary25: '#1c1c1c', // hover
      neutral20: '#c0c0c0', // border
      primary: '#000',
      neutral0: '#1c1c1c', // '#22252b', // background
      neutral80: '#bfbfbf', // placeholder
      neutral90: 'white',
    },
  });

  // when user clicks nodetype will be added to this array to populate the filter.
  // hardcoded for now.
  return (
    <div>
      <div className="filter-inner-wrapper">
        <div
          className="topology-filters-wrapper"
          style={{ flexWrap: 'wrap', width: '100%', display: 'flex' }}
        >
          <div>
            <div className="filter">
              <Link to="/topology/cloud">
                <div className="filter-name" style={{ color: '#abb2b7' }}>
                  Cloud view
                </div>{' '}
              </Link>
              {isGraphViewMode && viewUrl.includes('cloud') && (
                <div
                  className="fa fa-plus filter-remove-btn"
                  aria-hidden="true"
                  style={{
                    color: 'white',
                    marginLeft: '7px',
                    fontSize: '15px',
                  }}
                  onClick={() => addCloudProviderFilter()}
                />
              )}
            </div>
          </div>
          {viewUrl.includes('cloud') && renderChildFilterComponent()}
          <div>
            <div
              className="filter"
              style={{
                backgroundColor: '#2962ff',
                color: 'black',
                opacity: 0.8,
              }}
            >
              <Link to="/topology/k8s">
                {' '}
                <div className="filter-name" style={{ color: 'white' }}>
                  K8s view
                </div>{' '}
              </Link>
              {isGraphViewMode && viewUrl.includes('k8s') && (
                <div
                  className="fa fa-plus filter-remove-btn"
                  aria-hidden="true"
                  style={{
                    color: 'white',
                    marginLeft: '7px',
                    fontSize: '15px',
                  }}
                  onClick={() => addCloudProviderFilter()}
                />
              )}
            </div>
          </div>
          {viewUrl.includes('k8s') && renderChildFilterComponent()}
          <div>
            <div
              className="filter"
              style={{
                backgroundColor: '#f8cd39',
                color: 'black',
                opacity: 0.8,
              }}
            >
              <Link to="/topology/hosts">
                {' '}
                <div className="filter-name" style={{ color: 'black' }}>
                  Host view
                </div>
              </Link>
              {isGraphViewMode && viewUrl.includes('hosts') && (
                <div
                  className="fa fa-plus filter-remove-btn"
                  aria-hidden="true"
                  style={{
                    color: 'black',
                    marginLeft: '7px',
                    fontSize: '15px',
                  }}
                  onClick={() => addCloudProviderFilter()}
                />
              )}
            </div>
          </div>
          {viewUrl.includes('hosts') && renderChildFilterComponent()}
          {isGraphViewMode && (
            <div>
              <OutsideClickHandler
                onOutsideClick={() => setShowCloudProviderDropdown(false)}
              >
                {showCloudProviderDropdown && (
                  <Select
                    components={{
                      IndicatorSeparator: null,
                    }}
                    styles={styles}
                    theme={themeCb}
                    placeholder="Search filter"
                    options={optionValues}
                    value={optionValues.id}
                    classNamePrefix="select"
                    className="select-filter"
                    onChange={onCloudProviderFilterSelected}
                  />
                )}
              </OutsideClickHandler>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default withRouter(NodeFiltersPanel);
