import { upperCase } from 'lodash-es';

const UPPERCASE_WORDS = ['id', 'cve', 'poc'];
export function replacebyUppercaseCharacters(key: string) {
  return key
    .split('_')
    .map((word) => {
      if (UPPERCASE_WORDS.includes(word)) return upperCase(word);
      return word;
    })
    .join(' ');
}
