/* eslint-disable no-unused-vars */
import React, { useCallback, useState } from 'react';
import injectModalTrigger from '../common/generic-modal/modal-trigger-hoc';
import DFSelect from '../common/multi-select/app';

class AdvanceFilterOption extends React.Component {
  constructor() {
    super();
    this.openFilterModal = this.openFilterModal.bind(this);
  }

  openFilterModal() {
    const { modalContent } = this.props;
    const modalProps = {
      title: 'Filters',
      modalContent,
      contentStyles: {
        width: '400px',
      },
      showClosebutton: true,
    };
    const { triggerModal } = this.props;
    triggerModal('GENERIC_MODAL', modalProps);
  }

  render() {
    const advanceVar = 'Advanced';
    const { filters = [] } = this.props;
    if (filters.length > 0) {
      return (
        <span
          onClick={this.openFilterModal}
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

  // eslint-disable-next-line array-callback-return
  const nodeFiltersOptions = nodeFilters && nodeFilters.filter(item => { if (item.label !== 'CloudTrail') return item;});

  return (
    <div className="form-group df-select-field" style={{ width: '250px' }}>
      {nodeFiltersOptions.map(filter => (
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
