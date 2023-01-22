import './scan.css';

export const ScanInProgress = () => {
  return (
    <div className="flex flex-col items-center">
      <div className="scan-summary relative flex justify-center items-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
          <circle
            id="arc2"
            className="circle"
            cx="150"
            cy="150"
            r="120"
            opacity=".49"
            fill="none"
            stroke="#632b26"
            strokeWidth="8"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
          <circle
            id="arc3"
            className="circle"
            cx="150"
            cy="150"
            r="100"
            opacity=".49"
            fill="none"
            stroke="#632b26"
            strokeWidth="15"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
          <circle
            id="arc4"
            className="circle"
            cx="150"
            cy="150"
            r="120"
            opacity=".49"
            fill="none"
            stroke="#632b26"
            strokeWidth="20"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
          <circle
            id="arc5"
            className="circle"
            cx="150"
            cy="150"
            r="100"
            opacity=".89"
            fill="none"
            stroke="#632b26"
            strokeWidth="8"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
          <circle
            id="arc6"
            className="circle"
            cx="150"
            cy="150"
            r="90"
            opacity=".49"
            fill="none"
            stroke="#632b26"
            strokeWidth="16"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
          <circle
            id="arc7"
            className="circle"
            cx="150"
            cy="150"
            r="90"
            opacity=".89"
            fill="none"
            stroke="#632b26"
            strokeWidth="8"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
          <circle
            id="arc8"
            className="circle"
            cx="150"
            cy="150"
            r="80"
            opacity=".79"
            fill="#4DD0E1"
            fillOpacity="0"
            stroke="#632b26"
            strokeWidth="8"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
        </svg>
        <span className="absolute text-blue-500 animate-bounce dark:text-blue-400">
          Scanning...
        </span>
      </div>
      <section className="text-center mt-4">
        <h2 className="text-base font-medium text-gray-700 dark:text-gray-400">
          Your Compliance Scan is currently running...
        </h2>
        <p className="text-gray-500 text-sm">
          We will show you the result when the scan is complete
        </p>
      </section>
    </div>
  );
};
