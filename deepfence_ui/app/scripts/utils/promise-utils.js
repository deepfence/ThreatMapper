/* eslint-disable prefer-promise-reject-errors */
export const makeCancellable = (promise) => {
  let hasCancelled = false;
  const wrappedPromise = new Promise((resolve, reject) => {
    promise.then(
      (val) => {
        if (hasCancelled) {
          reject({ isCancelled: true });
        } else {
          resolve(val);
        }
      },
      (error) => {
        if (hasCancelled) {
          reject({ isCancelled: true });
        } else {
          reject(error);
        }
      }
    );
  });

  return {
    promise: wrappedPromise,
    cancel() {
      hasCancelled = true;
    },
  };
};

export const waitAsync = (delayInMs = 0) => new Promise((resolve) => {
  setTimeout(resolve, delayInMs);
});

export const isPromise = param => (
  // TODO: check why above logic is not working with Reqwest lib.
  param.then && typeof (param.then) === 'function'
);
