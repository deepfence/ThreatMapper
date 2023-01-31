import './scan.css';

export const ScanLoader = ({ text }: { text: string }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="scan-summary relative flex justify-center items-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
          <circle
            id="cir2"
            className="circle"
            cx="150"
            cy="150"
            r="120"
            opacity=".49"
            fill="none"
            strokeWidth="8"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
          <circle
            id="cir3"
            className="circle"
            cx="150"
            cy="150"
            r="100"
            opacity=".49"
            fill="none"
            strokeWidth="15"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
          <circle
            id="cir4"
            className="circle"
            cx="150"
            cy="150"
            r="120"
            opacity=".49"
            fill="none"
            strokeWidth="20"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
          <circle
            id="cir5"
            className="circle"
            cx="150"
            cy="150"
            r="100"
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
            cx="150"
            cy="150"
            r="90"
            opacity=".49"
            fill="none"
            strokeWidth="16"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
          <circle
            id="cir7"
            className="circle"
            cx="150"
            cy="150"
            r="90"
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
            cx="150"
            cy="150"
            r="80"
            opacity=".79"
            fillOpacity="0"
            strokeWidth="8"
            strokeLinecap="square"
            strokeOpacity=".99213"
            paintOrder="fill markers stroke"
          />
        </svg>
        <span className="absolute text-blue-500 animate-bounce">Scanning...</span>
      </div>
      <section className="text-center mt-4">
        <h2 className="text-base font-medium text-gray-700 dark:text-gray-400">{text}</h2>
      </section>
    </div>
  );
};
