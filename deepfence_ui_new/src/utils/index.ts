export function basePath(urlPath: string) {
  //
  // "/scope/terminal.html" -> "/scope"
  // "/scope/" -> "/scope"
  // "/scope" -> "/scope"
  // "/" -> ""
  //
  const parts = urlPath.split('/');
  // if the last item has a "." in it, e.g. foo.html...
  if (parts[parts.length - 1].indexOf('.') !== -1) {
    return parts.slice(0, -1).join('/');
  }
  return parts.join('/').replace(/\/$/, '');
}

export function getWebsocketUrl(
  host = window.location.host,
  pathname = window.location.pathname,
) {
  //   if (process.env.WS_BASE_URL) {
  //     return process.env.WS_BASE_URL;
  //   }
  return 'wss://threatmapper.deepfence.show';
  const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${wsProto}://${host}${process.env.SCOPE_API_PREFIX || ''}${basePath(pathname)}`;
}
