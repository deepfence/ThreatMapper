import { useQuery } from 'react-query';

type Character = {
  name: string;
};

const fetchRepoData = (): Promise<{ name: string }> =>
  fetch('https://api.github.com/repos/tannerlinsley/react-query').then((res) =>
    res.json(),
  );

export function useRepoData() {
  return useQuery<Character, Error>(['repoData'], fetchRepoData);
}
