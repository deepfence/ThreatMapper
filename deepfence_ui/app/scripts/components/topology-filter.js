import React from 'react';
import Select from 'react-select';
import Tippy from '@tippyjs/react';
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
    viewUrl,
  } = props;

  let bgcolor = '';
  let fontColor = '';

  if( viewUrl.includes('hosts')) {
    bgcolor = '#f8cd39';
    fontColor = 'black';
  } else if (viewUrl.includes('k8s')) {
    bgcolor = '#2962ff';
    fontColor = 'white';
  }
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
      <div key={index} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
        <Tippy content={currentFilter} placement="bottom" trigger="mouseenter">
          <div className="filter" title={currentFilter} style={{backgroundColor: bgcolor, opacity: 0.8}}>
            <div className="filter-name" style={{color: fontColor}}>{frontEllipsis(currentFilter)}</div>
            <div style={{ marginTop: '3px' }}>
              <div
                className="fa fa-plus filter-remove-btn"
                aria-hidden="true"
                style={{ paddingLeft: '5px', cursor: 'pointer', color:  fontColor }}
                onClick={() => addFilter(index, filter)}
              />
            </div>
            <div
              className="fa fa-times filter-remove-btn"
              aria-hidden="true"
              style={{ paddingLeft: '5px', cursor: 'pointer', color:  fontColor }}
              onClick={() => removeFilter(filter)}
            />
          </div>
        </Tippy>
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
