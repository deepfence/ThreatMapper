import { useLoaderData } from 'react-router-dom';

import { getUserApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { UserManagementForm } from '@/features/settings/components/UserManagementForm';
import { ApiError, makeRequest } from '@/utils/api';

export type LoaderDataType = {
  error?: string;
  message?: string;
  data?: object;
};

export async function getUsersData(): Promise<LoaderDataType> {
  const result = await makeRequest({
    apiFunction: getUserApiClient().getUsers,
    apiArgs: [],
    errorHandler: async (r) => {
      const error = new ApiError<LoaderDataType>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(result)) {
    throw result.value();
  }

  if (result === null) {
    return {
      data: [],
    };
  }

  return {
    data: Object.values(result),
  };
}

const loader = async (): Promise<LoaderDataType> => {
  return await getUsersData();
};

export const UserManagement = () => {
  const loaderData = useLoaderData() as LoaderDataType;
  return (
    <div className="m-2">
      <UserManagementForm loaderData={loaderData} />
    </div>
  );
};

export const module = {
  loader,
  element: <UserManagement />,
};
