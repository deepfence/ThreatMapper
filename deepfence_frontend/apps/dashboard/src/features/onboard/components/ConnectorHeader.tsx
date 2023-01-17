import cx from 'classnames';
import { HiChevronRight } from 'react-icons/hi';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb, BreadcrumbLink, Typography } from 'ui-components';

type ConnectorHeaderProps = {
  title: string;
  description: string;
};

const canRoute = (pathname: string) => {
  const path = {
    addConnector: '/onboard/connectors/add-connectors',
    scanResult: '',
    viewResult: '',
  };
  if (pathname.includes('view-scan-results')) {
    path.viewResult = '/onboard/view-scan-results';
    path.scanResult = '/onboard/scan-infrastructure';
  } else if (pathname.includes('scan-infrastructure')) {
    path.scanResult = '/onboard/scan-infrastructure';
    path.viewResult = '#';
  } else if (pathname.includes('connectors')) {
    path.scanResult = '#';
    path.viewResult = '#';
  }
  return path;
};

export const ConnectorHeader = ({ title, description }: ConnectorHeaderProps) => {
  const location = useLocation();

  const isAddConnectorRoutePath = () => {
    return (
      location.pathname.startsWith('/onboard/connectors') ||
      location.pathname.includes('/onboard/instructions')
    );
  };

  const isScanRoutePath = () => {
    return location.pathname.includes('scan-infrastructure');
  };

  const isViewResultsRoutePath = () => {
    return location.pathname.includes('view-scan-results');
  };

  return (
    <div className="pt-6 mb-8">
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
              to={canRoute(location.pathname).scanResult}
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
                ['text-blue-600 dark:text-blue-500']: isViewResultsRoutePath(),
              })}
            >
              View Scan Results
            </Link>
          </BreadcrumbLink>
        </Breadcrumb>
      </div>
      <h1 className={`text-[32px] text-black dark:text-white`}>{title}</h1>
      <p
        className={`${Typography.size.base} ${Typography.weight.normal} mt-1.5 mb-4 dark:text-gray-400 text-gray-900`}
      >
        {description}
      </p>
    </div>
  );
};
