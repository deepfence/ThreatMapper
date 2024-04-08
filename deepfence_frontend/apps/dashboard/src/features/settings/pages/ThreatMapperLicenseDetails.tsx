import { useSuspenseQuery } from '@suspensive/react-query';
import { upperFirst } from 'lodash-es';
import { Suspense, useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { cn } from 'tailwind-preset';
import { Button, Card, CircleSpinner, Modal } from 'ui-components';

import { getAuthenticationApiClient, getSettingsApiClient } from '@/api/api';
import { ModelLicense } from '@/api/generated';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper, redirectToLogin } from '@/utils/api';
import storage from '@/utils/storage';

interface ActionReturnType {
  error?: string;
  message?: string;
  success?: boolean;
}
enum ActionEnumType {
  DELETE = 'delete',
  REGISTER_LICENSE = 'registerLicense',
}
async function cleanupAndLogout() {
  const logoutApi = apiWrapper({
    fn: getAuthenticationApiClient().logout,
    options: {
      handleAuthError: false,
    },
  });
  const logoutResponse = await logoutApi();
  if (!logoutResponse.ok) {
    console.error(logoutResponse.error);
    console.error('unable to log out from the console, continuing...');
  }

  storage.clearAuth();
  throw redirectToLogin();
}

export const action = async ({
  request,
}: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();
  const intent = formData.get('intent')?.toString() ?? '';

  if (intent === ActionEnumType.DELETE) {
    const deleteApi = apiWrapper({
      fn: getSettingsApiClient().deleteThreatMapperLicense,
    });
    const deleteResponse = await deleteApi();
    if (!deleteResponse.ok) {
      if (deleteResponse.error.response.status === 400) {
        const { message } = await getResponseErrors(deleteResponse.error);
        return {
          success: false,
          message,
        };
      } else if (deleteResponse.error.response.status === 403) {
        const message = await get403Message(deleteResponse.error);
        return {
          message,
          success: false,
        };
      }
      throw deleteResponse.error;
    }
    await cleanupAndLogout();
  } else if (intent === ActionEnumType.REGISTER_LICENSE) {
    const licenseApi = apiWrapper({
      fn: getSettingsApiClient().getThreatMapperLicense,
    });
    const response = await licenseApi();
    if (!response.ok) {
      if (response.error.response.status === 400) {
        const { message } = await getResponseErrors(response.error);
        return {
          success: false,
          message,
        };
      } else if (response.error.response.status === 403) {
        const message = await get403Message(response.error);
        return {
          message,
          success: false,
        };
      }
      throw response.error;
    }
    invalidateAllQueries();
  } else {
    throw new Error('Invalid intent');
  }
  return {
    success: true,
  };
};

const DeleteConfirmationModal = ({
  showDialog,
  setShowDialog,
}: {
  showDialog: boolean;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionReturnType>();

  return (
    <Modal
      size="s"
      open={showDialog}
      onOpenChange={() => setShowDialog(false)}
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center dark:text-status-error">
            <span className="h-6 w-6 shrink-0">
              <ErrorStandardLineIcon />
            </span>
            License key
          </div>
        ) : undefined
      }
      footer={
        !fetcher.data?.success ? (
          <div className={'flex gap-x-4 justify-end'}>
            <Button
              onClick={() => setShowDialog(false)}
              type="button"
              variant="outline"
              size="md"
            >
              Cancel
            </Button>
            <fetcher.Form method="post">
              <input hidden value={ActionEnumType.DELETE} name="intent" readOnly />
              <Button
                color="error"
                type="submit"
                size="md"
                disabled={fetcher.state !== 'idle'}
                loading={fetcher.state !== 'idle'}
              >
                Delete
              </Button>
            </fetcher.Form>
          </div>
        ) : (
          <SuccessModalContent text="Deleted successfully" />
        )
      }
    >
      {!fetcher.data?.success ? (
        <div className="grid">
          <span>
            You will require to relogin and register a license key if you delete it.
          </span>
          <br />
          <span>Are you sure you want to delete?</span>
          {fetcher.data?.message && (
            <p className="mt-2 text-p7 dark:text-status-error">{fetcher.data?.message}</p>
          )}
        </div>
      ) : undefined}
    </Modal>
  );
};

export const ThreatMapperLicenseDetails = () => {
  return (
    <div className="space-y-2">
      <div className="mt-2">
        <h3 className="text-h6 dark:text-text-input-value">License details</h3>
      </div>
      <Suspense fallback={<CircleSpinner size="sm" />}>
        <LicenseDetailsContent />
      </Suspense>
    </div>
  );
};

const LicenseDetailsContent = () => {
  const { data: licenseData } = useSuspenseQuery({
    ...queries.setting.getThreatMapperLicense(),
  });

  return <LicenseCard licenseData={licenseData} />;
};

const LicenseCard = ({ licenseData }: { licenseData: ModelLicense }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const fetcher = useFetcher<ActionReturnType>();
  return (
    <Card className="p-4 rounded-[5px]">
      {licenseData.message && licenseData.message.length ? (
        <h4
          className={cn('text-status-error', {
            'text-status-error text-p7': !licenseData.is_active,
            'text-status-success text-h4': licenseData.is_active,
          })}
        >
          {upperFirst(licenseData.message)}
        </h4>
      ) : null}

      <div className="flex flex-col gap-3 mt-4">
        <div className="flex">
          <span className="text-p4 min-w-[160px] text-text-text-and-icon">
            License key
          </span>
          <span className="text-p4a text-text-input-value">{licenseData.key ?? '-'}</span>
        </div>
        <div className="flex">
          <span className="text-p4 min-w-[160px] text-text-text-and-icon">
            License type
          </span>
          <span className="text-p4a text-text-input-value capitalize">
            {(licenseData.license_type ?? '-').replaceAll('_', ' ')}
          </span>
        </div>
        <div className="flex">
          <span className="text-p4 min-w-[160px] text-text-text-and-icon">End date</span>
          <span className="text-p4a text-status-error">
            {licenseData.end_date ?? '-'}
          </span>
        </div>
        <div className="flex">
          <span className="text-p4 min-w-[160px] text-text-text-and-icon">
            No. of hosts
          </span>
          <span className="text-p4a text-text-input-value">
            {licenseData.no_of_hosts ?? '-'}
          </span>
        </div>
        <div className="flex">
          <span className="text-p4 min-w-[160px] text-text-text-and-icon">
            Current No. of hosts
          </span>
          <span className="text-p4a text-text-input-value">
            {licenseData.current_hosts ?? '-'}
          </span>
        </div>
      </div>
      {licenseData.key && licenseData.key.length ? (
        <Button
          size="sm"
          color="error"
          className="mt-4 w-fit"
          type="button"
          onClick={() => {
            setShowDeleteDialog(true);
          }}
        >
          Delete license key
        </Button>
      ) : (
        <>
          {licenseData.message &&
          (licenseData.message.match(/not have enough permission/g)?.length ?? 0) >
            0 ? null : (
            <fetcher.Form method="post">
              <input
                hidden
                value={ActionEnumType.REGISTER_LICENSE}
                name="intent"
                readOnly
              />
              <Button
                size="sm"
                className="mt-4 w-fit"
                type="submit"
                loading={fetcher.state !== 'idle'}
                disabled={fetcher.state !== 'idle'}
              >
                Register license key
              </Button>
            </fetcher.Form>
          )}
        </>
      )}
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          setShowDialog={setShowDeleteDialog}
        />
      )}
    </Card>
  );
};

export const module = {
  element: <ThreatMapperLicenseDetails />,
  action,
};
