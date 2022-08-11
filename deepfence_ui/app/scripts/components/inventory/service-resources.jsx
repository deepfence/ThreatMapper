import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  breadcrumbChange,
  getResourcesForCloudServiceAction,
} from '../../actions';
import { AuthenticatedLayout } from '../layouts/AuthenticatedLayout';
import { DfTableV2 } from '../common/df-table-v2';
import { dateTimeFormat } from '../../utils/time-utils';
import { SearchInput } from '../common/inputs/search-input';
import styles from './service-resources.module.scss';
import AppLoader from '../common/app-loader/app-loader';
import { SingleSelectDropdown } from '../common/dropdown/single-select-dropdown';

export const InventoryServiceResourceView = props => {
  const { cloudtype, nodeid, serviceid } = props.match.params;
  const dispatch = useDispatch();
  const [filters, setFilters] = useState({
    searchText: '',
    region: null,
    isScanned: null,
  });

  const location = props.location.pathname;

  const { resources, loading } = useSelector(state => {
    return {
      resources: state.getIn(
        ['resourcesForCloudService', nodeid, serviceid, 'data'],
        []
      ),
      loading: state.getIn(
        ['resourcesForCloudService', nodeid, serviceid, 'status', 'loading'],
        false
      ),
    };
  });

  let filteredResources = resources;

  useEffect(() => {
    dispatch(
      getResourcesForCloudServiceAction({
        nodeid,
        serviceid,
      })
    );
    dispatch(
      breadcrumbChange([
        { name: 'Inventory', link: `/compliance/${cloudtype}` },
        {
          name: nodeid?.split?.(';')?.[0],
          link: `/compliance/cloud-inventory/${cloudtype}/${nodeid}`,
        },
        { name: serviceid?.split?.('_')?.join?.(' ') },
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

  filteredResources = resources?.filter(resource => {
    return (
      resource?.name
        ?.toLowerCase?.()
        ?.includes?.(filters.searchText?.trim?.().toLowerCase?.() ?? '') &&
      (filters.region?.length ? filters.region === resource.region : true) &&
      (filters.isScanned === 'yes'
        ? !!resource.scan_data?.last_scanned
        : true) &&
      (filters.isScanned === 'no' ? !resource.scan_data?.last_scanned : true)
    );
  });

  const columns = [
    {
      accessor: 'name',
      Header: 'Name',
      Cell: ({ value }) => {
        return (
          <div className="truncate" title={value}>
            {value}
          </div>
        );
      },
      width: 50,
    },
    {
      accessor: 'arn',
      Header: 'ARN',
      Cell: ({ value }) => {
        return (
          <div className="truncate" title={value}>
            {value}
          </div>
        );
      },
    },
    {
      accessor: 'region',
      Header: 'Region',
      Cell: ({ value }) => {
        return value ?? '-';
      },
      width: 50,
      maxWidth: 50,
    },
    {
      id: 'lastScannedAt',
      Header: 'Last scanned',
      Cell: ({ row: { original } }) => {
        return original.scan_data?.last_scanned
          ? dateTimeFormat(original.scan_data?.last_scanned)
          : 'Not scanned';
      },
      width: 50,
      maxWidth: 50,
    },
  ];

  return (
    <AuthenticatedLayout hideLuceneQuery>
      <div className={styles.container}>
        <div className={styles.filtersContainer}>
          <Filters
            allResources={resources}
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
        </div>
        <div>
          <DfTableV2
            noMargin
            data={filteredResources}
            columns={columns}
            showPagination
            defaultPageSize={20}
            noDataText="No resources found in this service."
            renderRowSubComponent={({ row }) => {
              return (
                <ScanResults
                  scanData={row.original.scan_data}
                  cloudtype={cloudtype}
                  nodeid={nodeid}
                  resource={row.original.arn}
                  serviceid={serviceid}
                />
              );
            }}
            enableSorting
          />
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

const Filters = ({ filters, onFiltersChange, allResources }) => {
  const [uniqueRegions, setUniqueRegions] = useState([]);

  useEffect(() => {
    const uniqueRegions = [];
    if (allResources.length) {
      allResources.forEach(resource => {
        if (
          resource.region?.length &&
          !uniqueRegions.includes(resource.region)
        ) {
          uniqueRegions.push(resource.region);
        }
      });
    }
    setUniqueRegions(uniqueRegions);
  }, [allResources, setUniqueRegions]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
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
      <SingleSelectDropdown
        placeholder="Region"
        onChange={e => {
          onFiltersChange({
            region: e?.value ?? null,
          });
        }}
        isClearable
        options={uniqueRegions.map(region => ({
          label: region,
          value: region,
        }))}
        width={200}
      />
      <SingleSelectDropdown
        placeholder="Scan status"
        onChange={e => {
          onFiltersChange({
            isScanned: e?.value ?? null,
          });
        }}
        isClearable
        options={[
          {
            label: 'Scanned',
            value: 'yes',
          },
          {
            label: 'Not scanned',
            value: 'no',
          },
        ]}
        width={200}
      />
    </div>
  );
};

const ScanResults = ({ scanData, nodeid, cloudtype, resource, serviceid }) => {
  const keys = Object.keys(scanData);
  if (!keys.length) {
    return <NotScannedMessage />;
  }

  const scanTypes = keys.filter(key => {
    return ['cis', 'gdpr', 'hipaa', 'pci', 'soc2', 'nist'].includes(key);
  });

  const data = scanTypes.map(scanType => {
    return {
      scanType,
      status: 'COMPLETED',
      scanId: scanData?.[scanType]?.scan_id ?? '',
      alarm: scanData?.[scanType]?.alarm ?? 0,
      ok: scanData?.[scanType]?.ok ?? 0,
      info: scanData?.[scanType]?.info ?? 0,
      skip: scanData?.[scanType]?.skip ?? 0,
    };
  });

  const columns = [
    {
      accessor: 'scanType',
      Header: 'Compliance Type',
      width: 200,
      Cell: ({ value }) => {
        return value?.toUpperCase?.();
      },
    },
    {
      accessor: 'status',
      Header: 'Status',
      Cell: cell => (
        <div
          className={
            cell.value === 'COMPLETED' ? 'status-success' : 'status-failed'
          }
        >
          {cell.value}
        </div>
      ),
    },
    {
      accessor: 'alarm',
      Header: 'Alarm',
      width: 50,
      minWidth: 50,
      Cell: cell => <div className="compliance-hipaa-alarm">{cell.value}</div>,
    },
    {
      accessor: 'ok',
      Header: 'Ok',
      width: 50,
      minWidth: 50,
      Cell: cell => <div className="compliance-hipaa-ok">{cell.value}</div>,
    },
    {
      accessor: 'info',
      Header: 'Info',
      width: 50,
      minWidth: 50,
      Cell: cell => <div className="compliance-hipaa-info">{cell.value}</div>,
    },
    {
      accessor: 'skip',
      Header: 'Skip',
      width: 50,
      minWidth: 50,
      Cell: cell => <div className="compliance-hipaa-skip">{cell.value}</div>,
    },
    {
      id: 'actions',
      Header: 'Actions',
      width: 50,
      minWidth: 50,
      Cell: ({ row }) => (
        <div>
          <Link
            to={{
              pathname: `/compliance/summary/${nodeid}/${row.original?.scanType}/${row.original?.scanId}/${cloudtype}`,
              search: new URLSearchParams({
                resource,
                serviceId: serviceid,
              }).toString(),
            }}
          >
            Full details &gt;
          </Link>
        </div>
      ),
    },
  ];
  return (
    <div className={styles.scansTableContainer}>
      <div className={styles.scansTableTitle}>Last scan details &gt;</div>
      <DfTableV2 noMargin data={data} columns={columns} />
    </div>
  );
};

const NotScannedMessage = () => {
  return (
    <div className={styles.notScannedMessage}>
      This resource has never been scanned.
    </div>
  );
};
