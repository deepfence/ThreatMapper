import { Listbox, ListboxOption } from 'ui-components';

import { useGetSecretRulesForScan } from '@/features/secrets/data-components/secretScanRulesApiLoader';

export const SecretRulesForScan = ({
  scanId,
  selectedRules,
  onChange,
}: {
  scanId: string;
  selectedRules: string[];
  onChange: (rules: string[]) => void;
}) => {
  const { rules } = useGetSecretRulesForScan({ scanId });
  return (
    <Listbox
      multiple
      sizing="sm"
      label="Rule"
      placeholder="Select Rule"
      name="ruleFilter"
      value={selectedRules}
      onChange={(value) => {
        onChange(value);
      }}
    >
      {[...rules].sort().map((rule) => {
        return (
          <ListboxOption key={rule} value={rule}>
            {rule}
          </ListboxOption>
        );
      })}
    </Listbox>
  );
};
