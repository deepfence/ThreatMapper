import cx from 'classnames';
import { HiChevronRight } from 'react-icons/hi';
import { Link, useLocation } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';
import { Breadcrumb, BreadcrumbLink, Typography } from 'ui-components';

type ConnectorHeaderProps = {
  title: string;
  description: string;
  endComponent?: JSX.Element;
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
      <div className="mb-4">
        <Breadcrumb separator={<HiChevronRight />} transparent>
          <BreadcrumbLink>
            <>
              <span
                className={twMerge(
                  cx(
                    'w-6 h-6 rounded-full bg-gray-200 text-sm flex items-center justify-center',
                    'dark:bg-gray-700 dark:text-gray-100',
                    'cursor-auto',
                    {
                      ['text-blue-600 dark:text-blue-500']: isAddConnectorRoutePath(),
                    },
                  ),
                )}
              >
                1
              </span>
              <Link
                to={'/onboard/connectors/add-connectors'}
                className={cx('ml-2', {
                  ['text-blue-600 dark:text-blue-500']: isAddConnectorRoutePath(),
                })}
              >
                Add a connector
              </Link>
            </>
          </BreadcrumbLink>
          <BreadcrumbLink className="cursor-auto">
            <>
              <span
                className={twMerge(
                  cx(
                    'w-6 h-6 rounded-full bg-gray-200 text-sm flex items-center justify-center',
                    'dark:bg-gray-700 dark:text-gray-100',
                    'cursor-auto',
                    {
                      ['text-blue-600 dark:text-blue-500']: isScanRoutePath(),
                    },
                  ),
                )}
              >
                2
              </span>
              <span
                className={cx('cursor-auto ml-2', {
                  ['text-blue-600 dark:text-blue-500']: isScanRoutePath(),
                })}
              >
                Scan Infrastructure
              </span>
            </>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <>
              <span
                className={twMerge(
                  cx(
                    'w-6 h-6 rounded-full bg-gray-200 text-sm flex items-center justify-center',
                    'dark:bg-gray-700 dark:text-gray-100',
                    'cursor-auto',
                    {
                      ['text-blue-600 dark:text-blue-500']: isViewScanSummaryRoutePath(),
                    },
                  ),
                )}
              >
                3
              </span>
              <span
                className={cx('cursor-auto ml-2', {
                  ['text-blue-600 dark:text-blue-500']: isViewScanSummaryRoutePath(),
                })}
              >
                View Scan Results
              </span>
            </>
          </BreadcrumbLink>
        </Breadcrumb>
      </div>
      <div className="flex items-center">
        <div>
          <h1 className={`text-h1 dark:text-text-input-value`}>{title}</h1>
          {description && (
            <p className={`text-p7 mt-1.5 mb-4 dark:text-white text-gray-900`}>
              {description}
            </p>
          )}
        </div>
        {endComponent ? <div className="ml-auto">{endComponent}</div> : null}
      </div>
    </div>
  );
};
