import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  breadcrumbChange,
  getServicesForCloudAccountAction,
} from '../../actions';
import { AuthenticatedLayout } from '../layouts/AuthenticatedLayout';
import styles from './services.module.scss';
import { CloudIconsMapping } from './iconResources';
import AppLoader from '../common/app-loader/app-loader';
import { SearchInput } from '../common/inputs/search-input';
import ToggleSwitch from '../common/toggle-switch';

export const InventoryServicesView = props => {
  const { cloudtype, nodeid } = props.match.params;
  const dispatch = useDispatch();
  const [filters, setFilters] = useState({
    searchText: '',
    hideWithoutResources: false,
    showWithIssues: false,
    showOnlyNotScanned: false,
  });

  const { services, loading } = useSelector(state => {
    return {
      loading: state.getIn(
        ['servicesForCloudAccount', nodeid, 'status', 'loading'],
        false
      ),
      services: state.getIn(['servicesForCloudAccount', nodeid, 'data'], []),
    };
  });

  let filteredServices = services;

  // TODO add check for cloud type
  useEffect(() => {
    dispatch(
      getServicesForCloudAccountAction({
        nodeid,
      })
    );
    dispatch(
      breadcrumbChange([
        { name: 'Inventory', link: `/compliance/${cloudtype}` },
        { name: nodeid.split(';')?.[0] },
      ])
    );
    return () => {
      dispatch(breadcrumbChange([]));
    };
  }, []);

  if (loading) {
    return (
      <AuthenticatedLayout hideLuceneQuery>
        <AppLoader />
      </AuthenticatedLayout>
    );
  }

  if (!services?.length) {
    return (
      <AuthenticatedLayout hideLuceneQuery>
        <NoData />
      </AuthenticatedLayout>
    );
  }

  filteredServices = services?.filter(service => {
    return (
      service?.label
        ?.toLowerCase?.()
        ?.includes?.(filters.searchText?.trim?.().toLowerCase?.() ?? '') &&
      (filters.hideWithoutResources === true ? !!service.count : true) &&
      (filters.showWithIssues === true
        ? !!service.total_scan_count?.alarm ||
        !!service.total_scan_count?.skip
        : true) &&
      (filters.showOnlyNotScanned === true
        ? (service.total_scan_count?.alarm ?? 0) +
        (service.total_scan_count?.info ?? 0) +
        (service.total_scan_count?.skip ?? 0) +
        (service.total_scan_count?.ok ?? 0) ===
        0
        : true)
    );
  });

  return (
    <AuthenticatedLayout hideLuceneQuery>
      <div className={styles.container}>
        <div className={styles.filtersContainer}>
          <Filters
            filters={filters}
            onFiltersChange={changedObj => {
              setFilters(prev => {
                return {
                  ...prev,
                  ...changedObj,
                };
              });
            }}
          />
          {!filteredServices.length && (
            <div>Search did not match any services.</div>
          )}
        </div>
        <div className={styles.servicesContainer}>
          {filteredServices.map((service, index) => {
            return (
              <ServiceCard
                // eslint-disable-next-line react/no-array-index-key
                key={`${index}-${service.id}`}
                service={service}
                cloudtype={cloudtype}
                nodeid={nodeid}
              />
            );
          })}
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

const ServiceCard = ({ service, cloudtype, nodeid }) => {
  return (
    <Link
      to={`/compliance/cloud-inventory/${cloudtype}/${nodeid}/${service.id}`}
      style={{ textDecoration: 'none' }}
    >
      <div className={styles.serviceCard} title={service.label}>
        <div className={styles.cardInner}>
          <div className={styles.serviceImageWrapper}>
            <img
              className={styles.serviceImage}
              src={
                CloudIconsMapping[cloudtype]?.[service.id] ??
                CloudIconsMapping[cloudtype]?.generic ??
                ''
              }
              alt="Service"
            />
          </div>
          <div className={styles.serviceLabel} title={service.label}>
            {service.label}
          </div>
          <div className={styles.countsContainer}>
            <div className={styles.resourcesCount}>
              {service.count > 1000 ? `1000+` : service.count} resources
            </div>
            <div>·</div>
            <div className={styles.issuesCount}>
              {(service.total_scan_count?.alarm ?? 0) + (service.total_scan_count?.skip ?? 0)} issues
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

const Filters = ({ filters, onFiltersChange }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '10px',
      }}
    >
      <SearchInput
        className={styles.searchInput}
        placeholder="Search"
        value={filters.searchText}
        onChange={e => {
          onFiltersChange({
            searchText: e.target.value ?? '',
          });
        }}
      />
      <ToggleSwitch
        input={{
          value: filters.hideWithoutResources,
          onChange: value => {
            onFiltersChange({
              hideWithoutResources: value,
            });
          },
        }}
        label="Hide services with no resources"
      />
      <ToggleSwitch
        input={{
          value: filters.showWithIssues,
          onChange: value => {
            onFiltersChange({
              showWithIssues: value,
            });
          },
        }}
        label="Show only with compliance issues"
      />
      <ToggleSwitch
        input={{
          value: filters.showOnlyNotScanned,
          onChange: value => {
            onFiltersChange({
              showOnlyNotScanned: value,
            });
          },
        }}
        label="Show only with no scans"
      />
    </div>
  );
};

const NoData = () => {
  return (
    <div className={styles.noData}>No services found in this account.</div>
  );
};
