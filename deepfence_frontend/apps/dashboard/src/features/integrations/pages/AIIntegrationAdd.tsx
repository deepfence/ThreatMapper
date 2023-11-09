import { useNavigate } from 'react-router-dom';
import {
  Button,
  Listbox,
  ListboxOption,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
  TextInput,
} from 'ui-components';

const AIIntegrationAdd = () => {
  const navigate = useNavigate();
  return (
    <SlidingModal
      open
      onOpenChange={(open) => {
        if (!open) navigate('..');
      }}
    >
      <SlidingModalCloseButton />
      <SlidingModalHeader>
        <div className="text-h3 dark:text-text-text-and-icon py-4 px-4 dark:bg-bg-breadcrumb-bar">
          Add Generative AI Integration
        </div>
      </SlidingModalHeader>
      <SlidingModalContent>
        <div className="flex flex-col gap-8 m-4">
          <Listbox
            variant="underline"
            label="Provider"
            placeholder="Please select provider"
          >
            <ListboxOption value="openai">OpenAI</ListboxOption>
          </Listbox>
          <TextInput label="API Key" type="password" name="api_key" />
          <div className="mt-2 flex gap-x-2 p-1">
            <Button
              size="md"
              color="default"
              type="submit"
              // loading={fetcher.state === 'submitting'}
              // disabled={fetcher.state === 'submitting'}
            >
              Add
            </Button>
            <Button
              type="button"
              size="md"
              color="default"
              variant="outline"
              onClick={() => navigate('..')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </SlidingModalContent>
    </SlidingModal>
  );
};

export const module = {
  element: <AIIntegrationAdd />,
};
