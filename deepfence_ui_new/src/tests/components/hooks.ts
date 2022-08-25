import { useQuery } from 'react-query';

type Character = {
  userId: string;
};

const fetchRepoData = (): Promise<Character> =>
  fetch('https://jsonplaceholder.typicode.com/posts/1').then((res) => res.json());

export function useRepoData() {
  return useQuery<Character, Error>(['repoData'], fetchRepoData);
}
