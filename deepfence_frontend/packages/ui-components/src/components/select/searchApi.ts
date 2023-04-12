type SelectItem = { value: string; label: string };

export const fetchData = async (
  offset: number,
  searchText: string,
): Promise<SelectItem[]> => {
  if (searchText) {
    const id = searchText;
    const res = await fetch(`https://api.punkapi.com/v2/beers/${id}`);
    const data = res.json();
    return data ?? [];
  } else {
    const res = await fetch(
      `https://api.punkapi.com/v2/beers?page=${offset}&per_page=${10}`,
    );
    const data = res.json();
    return data ?? [];
  }
};
