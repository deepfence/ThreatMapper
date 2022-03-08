/* eslint-disable no-unused-vars */
import React, { useCallback, useState } from 'react';
import injectModalTrigger from '../common/generic-modal/modal-trigger-hoc';
import DFSelect from '../common/multi-select/app';

const AdvanceFilterOption = (props) => {

  const openFilterModal = () => {
    const { modalContent } = props;
    const modalProps = {
      title: 'Filters',
      modalContent,
      contentStyles: {
        width: '400px',
      },
      showClosebutton: true,
    };
    const { triggerModal } = props;
    triggerModal('GENERIC_MODAL', modalProps);
  }

    const advanceVar = 'Advanced';
    const { filters = [] } = props;
    if (filters.length > 0) {
      return (
        <span
          onClick={openFilterModal}
          className="link"
          style={{ cursor: 'pointer', color: '#007FFF' }}
          aria-hidden="true"
        >
          {advanceVar}
        </span>
      );
    }
    return null;
}

export default injectModalTrigger(AdvanceFilterOption);

export const AdvancedFilterModalContent = ({
  nodeFilters,
  initialFilters,
  onFiltersChanged,
}) => {
  const [filters, setFilters] = useState();
  const setFilterOptions = useCallback(
    (name, options) => {
      // @ts-ignore

      const newFilters = { ...(filters || initialFilters), [name]: options };
      setFilters(newFilters);
      onFiltersChanged(newFilters);
    },
    [filters]
  );

  const filterValues = filters || initialFilters;

  return (
    <div className="form-group df-select-field" style={{ width: '250px' }}>
      {nodeFilters.map(filter => (
        <div className="search-form" key={filter.name}>
          <br />
          <DFSelect
            options={filter.options.map(el => ({
              label: el,
              value: el,
            }))}
            name={filter.name}
            placeholder={`${filter.label}`}
            onChange={selectedOptions =>
              setFilterOptions(filter.name, selectedOptions)
            }
            value={filterValues[filter.name]}
            isMulti
          />
        </div>
      ))}
    </div>
  );
};
