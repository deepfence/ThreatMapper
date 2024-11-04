import { useState } from 'react';
import { Card, Checkbox, TextInput } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { RegistryFormProps } from '@/features/common/data-component/RegistryConnectorForm';

/**
sample request body
  {
    "name": "example_dockerhub",
    "non_secret": {
      "docker_hub_namespace": "namespace",
      "docker_hub_username": "username"
    },
    "secret": {
      "docker_hub_password": "password"
    },
    "registry_type": "docker_hub"
  }
*/

export const DockerConnectorForm = ({ errorMessage, fieldErrors }: RegistryFormProps) => {
  const [isPublic, setIsPublic] = useState(false);

  return (
    <>
      <div className="text-p4a text-text-input-value mt-1.5 mb-4">
        Connect to your Docker Registry. Find out more information by{' '}
        <DFLink
          href={`https://community.deepfence.io/threatmapper/docs/v2.5/registries/`}
          target="_blank"
          rel="noreferrer"
        >
          reading our documentation
        </DFLink>
        .
      </div>
      <Card className="p-4">
        <p className="text-p1 text-text-input-value">Enter Information</p>
        <div className="mt-4 w-full relative flex flex-col gap-y-4">
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Registry Name"
            type={'text'}
            name="name"
            placeholder="Registry Name"
            helperText={fieldErrors?.name}
            color={fieldErrors?.name ? 'error' : 'default'}
            required
          />
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Namespace"
            type={'text'}
            info="e.g. nginx"
            name="non_secret.docker_hub_namespace"
            color={fieldErrors?.['docker_hub_namespace'] ? 'error' : 'default'}
            helperText={fieldErrors?.['docker_hub_namespace']}
            placeholder="Namespace"
            required
          />

          <div className="flex mt-2">
            <input hidden value={String(isPublic)} name="non_secret.is_public" />
            <Checkbox
              label="Public Registry"
              checked={isPublic}
              onCheckedChange={(checked: boolean) => {
                setIsPublic(checked);
              }}
            />
          </div>
          {!isPublic && (
            <div className="flex flex-col gap-y-4">
              <TextInput
                className="w-3/4 min-[200px] max-w-xs"
                label="Username"
                type={'text'}
                name="non_secret.docker_hub_username"
                color={fieldErrors?.['docker_hub_username'] ? 'error' : 'default'}
                helperText={fieldErrors?.['docker_hub_username']}
                required
                placeholder="Username"
              />
              <TextInput
                className="w-3/4 min-[200px] max-w-xs"
                label="Password"
                type={'password'}
                name="secret.docker_hub_password"
                color={fieldErrors?.['docker_hub_password'] ? 'error' : 'default'}
                helperText={fieldErrors?.['docker_hub_password']}
                placeholder="••••••••"
                required
              />
            </div>
          )}

          <div className="mt-2 text-p7a text-text-input-value">
            Supported Versions: API version v2
          </div>
        </div>
        {errorMessage && <p className="text-status-error text-p7a">{errorMessage}</p>}
      </Card>
    </>
  );
};
