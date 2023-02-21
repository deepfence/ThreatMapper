import { Card, Typography } from 'ui-components';

export const LicenseDetailsForm = () => {
  return (
    <div>
      <Card className="w-full relative p-5 mt-2">
        <table className=" w-full text-left">
          <tbody>
            <tr className="border-b border-gray-700">
              <td
                className={`${Typography.size.base} ${Typography.weight.extralight} dark:text-gray-400 px-4 py-2`}
              >
                Build Version
              </td>
              <td className="px-4 py-2">52a07aa2 (Febuary 9, 2022 8:00 PM)</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td
                className={`${Typography.size.base} ${Typography.weight.extralight} dark:text-gray-400 px-4 py-2`}
              >
                License Key
              </td>
              <td className="px-4 py-2">example</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td
                className={`${Typography.size.base} ${Typography.weight.extralight} dark:text-gray-400 px-4 py-2`}
              >
                License Type
              </td>
              <td className="px-4 py-2">annual subscription</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td
                className={`${Typography.size.base} ${Typography.weight.extralight} dark:text-gray-400 px-4 py-2`}
              >
                End Date
              </td>
              <td className="px-4 py-2">Tue 29 Jul 2025 04:56:19 GMT</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td
                className={`${Typography.size.base} ${Typography.weight.extralight} dark:text-gray-400 px-4 py-2`}
              >
                No of Hosts
              </td>
              <td className="px-4 py-2">30</td>
            </tr>
            <tr className="border-t border-gray-700">
              <td
                className={`${Typography.size.base} ${Typography.weight.extralight} dark:text-gray-400 px-4 py-2`}
              >
                License Notification Threshold
              </td>
              <td className="px-4 py-2">30%</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
};
