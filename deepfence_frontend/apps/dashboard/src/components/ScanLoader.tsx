import './scan.css';

export const ScanLoader = ({ text }: { text: string }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="scan-summary">
        <svg xmlns="http://www.w3.org/2000/svg" width="150" height="150">
          <circle
            id="cir2"
            className="circle"
            cx="75"
            cy="75"
            r="60"
            opacity=".49"
            fill="none"
            strokeWidth="10"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
          <circle
            id="cir3"
            className="circle"
            cx="75"
            cy="75"
            r="40"
            opacity=".49"
            fill="none"
            strokeWidth="12"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
          <circle
            id="cir4"
            className="circle"
            cx="75"
            cy="75"
            r="60"
            opacity=".49"
            fill="none"
            strokeWidth="14"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
          <circle
            id="cir5"
            className="circle"
            cx="75"
            cy="75"
            r="40"
            opacity=".89"
            fill="none"
            strokeWidth="8"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
          <circle
            id="cir6"
            className="circle"
            cx="75"
            cy="75"
            r="30"
            opacity=".49"
            fill="none"
            strokeWidth="11"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
          <circle
            id="cir7"
            className="circle"
            cx="75"
            cy="75"
            r="30"
            opacity=".89"
            fill="none"
            strokeWidth="8"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
          <circle
            id="cir8"
            className="circle"
            cx="75"
            cy="75"
            r="20"
            opacity=".79"
            fillOpacity="0"
            strokeWidth="8"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
        </svg>
      </div>
      <span className="text-blue-500 animate-pulse text-md tracking-wider">
        Scanning...
      </span>
      {text ? (
        <section className="text-center mt-4">
          <h2 className="text-base font-medium text-gray-700 dark:text-gray-400">
            {text}
          </h2>
        </section>
      ) : null}
    </div>
  );
};
