import { useLocation } from 'react-router-dom';
import { cn } from 'tailwind-preset';
import { Breadcrumb, BreadcrumbLink } from 'ui-components';

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
    <div className="pt-6">
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbLink isLink>
            <span
              className={cn(
                'w-6 h-6 rounded-full dark:bg-df-gray-200 text-p7 flex items-center justify-center',
                'dark:bg-gray-700 dark:text-df-gray-100 bg-gray-200 text-text-input-value cursor-default',
              )}
            >
              1
            </span>
            <span
              className={cn('flex items-center ml-2 cursor-default', {
                ['text-text-text-and-icon']: !isAddConnectorRoutePath(),
              })}
            >
              Add a connector
            </span>
          </BreadcrumbLink>
          <BreadcrumbLink className="cursor-auto">
            <span
              className={cn(
                'w-6 h-6 rounded-full dark:bg-df-gray-200 text-p7 flex items-center justify-center',
                'dark:bg-gray-700 dark:text-df-gray-100 bg-gray-200 text-text-input-value cursor-default',
              )}
            >
              2
            </span>

            <span
              className={cn('cursor-auto ml-2', {
                ['text-text-link']: isScanRoutePath(),
              })}
            >
              Scan infrastructure
            </span>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <span
              className={cn(
                'w-6 h-6 rounded-full dark:bg-df-gray-200 text-p7 flex items-center justify-center',
                'dark:bg-gray-700 dark:text-df-gray-100 bg-gray-200 text-text-input-value cursor-default',
              )}
            >
              3
            </span>
            <span
              className={cn('cursor-auto ml-2', {
                ['text-text-link']: isViewScanSummaryRoutePath(),
              })}
            >
              View scan results
            </span>
          </BreadcrumbLink>
        </Breadcrumb>
      </div>
      <div className="flex items-center">
        <div>
          <h1 className="text-h2 dark:text-text-input-value text-text-text-and-icon">
            {title}
          </h1>
          {description && (
            <p className="text-p4a mt-1.5 mb-4 dark:text-text-input-value text-text-text-and-icon">
              {description}
            </p>
          )}
        </div>
        {endComponent ? <div className="ml-auto">{endComponent}</div> : null}
      </div>
    </div>
  );
};
