export const sleep = (delayInMs = 2000): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, delayInMs);
  });
};
