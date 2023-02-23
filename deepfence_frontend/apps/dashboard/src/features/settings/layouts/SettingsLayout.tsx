import { LoaderFunction, redirect } from 'react-router-dom';

export const SettingsLoader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  if (['/settings', '/settings/'].includes(url.pathname)) {
    return redirect('/settings/license-details', 302);
  }
  return null;
};
