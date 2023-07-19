import { ApiDocsBadRequestResponse, ResponseError } from '@/api/generated';

export const get403Message = async (error: ResponseError): Promise<string> => {
  try {
    const response = (await error.response.json()) as ApiDocsBadRequestResponse;
    return response.message ?? 'You do not have enough permissions';
  } catch {
    return Promise.resolve('You do not have enough permissions');
  }
};

export const getFieldErrors = async (error: ResponseError) => {
  const response = (await error.response.json()) as ApiDocsBadRequestResponse;
  return response.error_fields;
};

export const getResponseErrors = async (error: ResponseError) => {
  try {
    const response = (await error.response.json()) as ApiDocsBadRequestResponse;
    return {
      message: response.message ?? 'An unknown error has occured',
      fieldErrors: response.error_fields,
    };
  } catch {
    return Promise.resolve({
      message: 'An unknown error has occured',
      fieldErrors: undefined,
    });
  }
};
