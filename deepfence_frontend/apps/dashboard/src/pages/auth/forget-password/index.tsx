export const forgotPasswordAction = async ({
  request,
}: {
  request: Request;
  params: Record<string, unknown>;
}) => {
  return {
    success: true,
  };
};
