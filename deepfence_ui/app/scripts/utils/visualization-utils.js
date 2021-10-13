/*eslint-disable*/

// Method to check legend edge case
export function legendEdgeCaseCheck(data) {
  let counter = 0;
  data.forEach((dataRecord)=> {
    if (!dataRecord.isVisible) {
      counter += 1;
    }
  });
  if (counter === data.length) {
    return true;
  } else {
    return false;
  }
}

// Method to check data available or not.
export function isDataAvailable(data) {
  let result;
  if (data && data.length > 0){
    result = true;
  } else {
    result = false;
  }
  return result;
}