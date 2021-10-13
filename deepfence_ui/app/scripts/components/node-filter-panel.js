import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Select from 'react-select';
import OutsideClickHandler from 'react-outside-click-handler';
import { addTopologyFilter } from '../actions/app-actions';
import { fetchTopologyData } from './multi-cloud/topology-client';
import TopologyFiltersBar from './topology-filter';

export default function NodeFiltersPanel(props) {
  // state constants for toggle switchs
  const [showCloudProviderDropdown, setShowCloudProviderDropdown] =
    useState(false);
  const [showChildDropdown, setShowChildDropDown] = useState(false);
  const [optionValues, setOptionValues] = useState([]);
  const [clickedIndexValue, setIndexValue] = useState(0);
  const topologyFilters =
    useSelector(state => state.get('topologyFilters')) || [];
  const dispatch = useDispatch();
  const { apiKey, apiUrl } = props;

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

  // filters out the pseudo nodes
  const setMenuValues = options => {
    const filteredMenuValue = options.filter(
      obj =>
        obj.pseudo !== true && obj.shape !== 'square' && !filterIds.has(obj.id)
    );
    setOptionValues(filteredMenuValue);
  };

  // adds children filter like cloud regions, hosts,
  const addChildFilter = (filterIndex, filter) => {
    const selectedFilter = filter[filter.length - 1];
    setOptionValues([]);
    fetchTopologyData(
      apiUrl,
      apiKey,
      selectedFilter.id,
      selectedFilter.label,
      selectedFilter.topo_node_type,
      selectedFilter.topo_children_types[0]
    ).then(data => setMenuValues(data));
    setShowChildDropDown(!showChildDropdown);
    setShowCloudProviderDropdown(false);
    setIndexValue(filterIndex);
  };

  const onChildFilterSelected = (e, filter) => {
    setShowChildDropDown(!showChildDropdown);
    dispatch(addTopologyFilter([...filter, { id: e.id }]));
  };

  // This can be generic function.
  const addCloudProviderFilter = () => {
    setOptionValues([]);
    fetchTopologyData(apiUrl, apiKey, null).then(data => {
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
        backgroundColor: '#333333'
      }
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
              <div className="filter-name">Cloud Providers</div>
            </div>
          </div>
          <TopologyFiltersBar
            filters={topologyFilters}
            clickedIndexValue={clickedIndexValue}
            styles={styles}
            theme={themeCb}
            showChildDropdown={showChildDropdown}
            setShowChildDropDown={setShowChildDropDown}
            handleOnChildFilterChange={onChildFilterSelected}
            addFilter={addChildFilter}
            optionValues={optionValues}
          />
          <div>
            <div
              className="fa fa-plus filter-remove-btn"
              aria-hidden="true"
              style={{ color: 'white', marginTop: '11px', fontSize: '15px' }}
              onClick={() => addCloudProviderFilter()}
            />
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
        </div>
      </div>
    </div>
  );
}
