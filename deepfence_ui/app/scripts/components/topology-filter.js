import React from 'react';
import Select from 'react-select';
import { Tooltip } from 'react-tippy';
import 'react-tippy/dist/tippy.css';
import OutsideClickHandler from 'react-outside-click-handler';

const frontEllipsis = text => {
  const splitText = text.split(' AND ');
  if (splitText.length > 1) {
    return `...${splitText[splitText.length - 1]}`;
  }
  return text;
};

const TopologyFiltersBar = props => {
  const {
    filters,
    clickedIndexValue,
    showChildDropdown,
    handleOnChildFilterChange,
    addFilter,
    removeFilter,
    styles,
    theme,
    optionValues,
    setShowChildDropDown,
  } = props;
  const filtersList = filters.map((filter, index) => {
    const currentFilter = filter.reduce(
      (accumulator, currentValue) =>
        (accumulator
          ? `${accumulator} AND ${currentValue.topo_node_type}:${currentValue.label}`
          : `${currentValue.topo_node_type}:${currentValue.label}`),
      ''
    );
    return (
      // eslint-disable-next-line react/no-array-index-key
      <div key={index} style={{ position: 'relative', display: 'flex' }}>
        <Tooltip title={currentFilter} position="bottom" trigger="mouseenter">
          <div className="filter" title={currentFilter}>
            <div className="filter-name">{frontEllipsis(currentFilter)}</div>
            <div style={{ marginTop: '3px' }}>
              <div
                className="fa fa-plus filter-remove-btn"
                aria-hidden="true"
                style={{ paddingLeft: '5px', cursor: 'pointer' }}
                onClick={() => addFilter(index, filter)}
              />
            </div>
            <div
              className="fa fa-times filter-remove-btn"
              aria-hidden="true"
              style={{ paddingLeft: '5px', cursor: 'pointer' }}
              onClick={() => removeFilter(filter)}
            />
          </div>
        </Tooltip>
        <div
          className="child-filter-dropdown"
        >
          {clickedIndexValue === index && showChildDropdown && (
            <OutsideClickHandler
              onOutsideClick={() => setShowChildDropDown(false)}
            >
              <Select
                components={{
                  IndicatorSeparator: null,
                }}
                styles={styles}
                theme={theme}
                options={optionValues}
                value={optionValues.id}
                placeholder="Search filter"
                classNamePrefix="select"
                className="select-filter"
                onChange={e => handleOnChildFilterChange(e, filter)}
              />
            </OutsideClickHandler>
          )}
        </div>
      </div>
    );
  });
  return filtersList;
};

export default TopologyFiltersBar;
