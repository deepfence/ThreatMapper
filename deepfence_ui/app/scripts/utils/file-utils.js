

export function downloadFile(filename, text, mimeType) {
  const element = document.createElement('a');
  element.setAttribute('href', `data:${mimeType ?? 'text/plain'};charset=utf-8,${encodeURIComponent(text)}`);
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

export function downloadBlobAsFile(filename, blob) {
  const element = document.createElement('a');
  element.setAttribute('href',  window.URL.createObjectURL(blob));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
