import cx from 'classnames';
import { HiChevronRight } from 'react-icons/hi';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb, BreadcrumbLink, Typography } from 'ui-components';

type ConnectorHeaderProps = {
  title: string;
  description: string;
  endComponent?: JSX.Element;
};

const canRoute = (pathname: string) => {
  const path = {
    addConnector: '/onboard/connectors/add-connectors',
    configureScan: '',
    viewResult: '',
  };
  if (pathname.includes('view-summary')) {
    path.viewResult = '/onboard/scan/view-summary';
    path.configureScan = '#';
  } else if (pathname.includes('scan/configure')) {
    path.configureScan = '#';
    path.viewResult = '#';
  } else if (pathname.includes('connectors')) {
    path.configureScan = '#';
    path.viewResult = '#';
  }
  return path;
};

export const ConnectorHeader = ({
  title,
  description,
  endComponent,
}: ConnectorHeaderProps) => {
  const location = useLocation();

  const isAddConnectorRoutePath = () => {
    return (
      location.pathname.startsWith('/onboard/connectors') ||
      location.pathname.includes('/onboard/instructions')
    );
  };

  const isScanRoutePath = () => {
    return (
      location.pathname.startsWith('/onboard/scan/choose') ||
      location.pathname.startsWith('/onboard/scan/configure')
    );
  };

  const isViewScanSummaryRoutePath = () => {
    return location.pathname.includes('scan/view-summary');
  };

  return (
    <div className="pt-6 mb-4">
      <div className="mb-4 -mx-5">
        <Breadcrumb separator={<HiChevronRight />} transparent>
          <BreadcrumbLink>
            <Link
              to={canRoute(location.pathname).addConnector}
              className={cx({
                ['text-blue-600 dark:text-blue-500']: isAddConnectorRoutePath(),
              })}
            >
              Add a connector
            </Link>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <Link
              to={'#'}
              className={cx({
                ['text-blue-600 dark:text-blue-500']: isScanRoutePath(),
              })}
            >
              Scan Infrastructure
            </Link>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <Link
              to={canRoute(location.pathname).viewResult}
              className={cx({
                ['text-blue-600 dark:text-blue-500']: isViewScanSummaryRoutePath(),
              })}
            >
              View Scan Results
            </Link>
          </BreadcrumbLink>
        </Breadcrumb>
      </div>
      <div className="flex items-center">
        <div>
          <h1 className={`text-[32px] text-black dark:text-white`}>{title}</h1>
          <p
            className={`${Typography.size.base} ${Typography.weight.normal} mt-1.5 mb-4 dark:text-gray-400 text-gray-900`}
          >
            {description}
          </p>
        </div>
        {endComponent ? <div className="ml-auto">{endComponent}</div> : null}
      </div>
    </div>
  );
};
