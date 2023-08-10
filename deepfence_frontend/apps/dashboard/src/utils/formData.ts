// This function is helpful when using listbox and combobox
// where key is in formdata like key[0] key[1] etc.
export function getArrayTypeValuesFromFormData(
  formData: FormData,
  key: string,
): Array<string> {
  const results: string[] = [];
  for (const [k, v] of formData.entries()) {
    if (k.includes('[') && k.endsWith(']') && k.split('[')[0] === key) {
      results.push(v.toString());
    }
  }
  return results;
}
