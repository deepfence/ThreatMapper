export const download = (url: string) => {
  if (!url) {
    console.warn('Download URL is empty');
    return;
  }
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('target', '_blank');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
