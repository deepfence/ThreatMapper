import { useSuspenseQuery } from '@suspensive/react-query';
import { ReactNode, Suspense } from 'react';

import { TimesIcon } from '@/components/icons/common/Times';
import {
  lookupClusterBatcher,
  lookupContainerBatcher,
  lookupContainerImagesBatcher,
  lookupHostsBatcher,
  lookupPodBatcher,
  lookupRegistryAccountBatcher,
} from '@/queries/batchers/lookup';

const Wrapper = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex items-center py-1 px-2.5 border border-accent-accent rounded-[11px] gap-2">
      {children}
    </div>
  );
};

const Text = ({ children }: { children: ReactNode }) => {
  return (
    <div className="text-p8 dark:text-text-input-value truncate max-w-[250px]">
      {children}
    </div>
  );
};

const RemoveButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <button
      className="h-3.5 w-3.5 dark:text-text-input-value"
      onClick={() => {
        onClick();
      }}
    >
      <TimesIcon />
    </button>
  );
};

type PrettifiableNodeTypes =
  | 'host'
  | 'container'
  | 'containerImage'
  | 'cluster'
  | 'registryAccount'
  | 'pod';

const PrettyNameHost = ({ id }: { id: string }) => {
  const { data } = useSuspenseQuery({
    queryKey: ['badge', 'lookup', 'host', id],
    queryFn: async () => {
      return lookupHostsBatcher.fetch(id);
    },
  });
  if (data) {
    return data.node_name;
  }
  return id;
};

const PrettyNameContainerImage = ({ id }: { id: string }) => {
  const { data } = useSuspenseQuery({
    queryKey: ['badge', 'lookup', 'containerImage', id],
    queryFn: async () => {
      return lookupContainerImagesBatcher.fetch(id);
    },
  });
  if (data) {
    return data.node_name;
  }
  return id;
};

const PrettyNameClusters = ({ id }: { id: string }) => {
  const { data } = useSuspenseQuery({
    queryKey: ['badge', 'lookup', 'cluster', id],
    queryFn: async () => {
      return lookupClusterBatcher.fetch(id);
    },
  });
  if (data) {
    return data.node_name;
  }
  return id;
};

const PrettyNameRegistryAccounts = ({ id }: { id: string }) => {
  const { data } = useSuspenseQuery({
    queryKey: ['badge', 'lookup', 'registryAccount', id],
    queryFn: async () => {
      return lookupRegistryAccountBatcher.fetch(id);
    },
  });
  if (data) {
    return `${data.name} (${data.registry_type})`;
  }
  return id;
};

const PrettyNamePod = ({ id }: { id: string }) => {
  const { data } = useSuspenseQuery({
    queryKey: ['badge', 'lookup', 'pod', id],
    queryFn: async () => {
      return lookupPodBatcher.fetch(id);
    },
  });
  if (data) {
    return data.node_name;
  }
  return id;
};

const PrettyNameContainers = ({ id }: { id: string }) => {
  const { data } = useSuspenseQuery({
    queryKey: ['badge', 'lookup', 'container', id],
    queryFn: async () => {
      return lookupContainerBatcher.fetch(id);
    },
  });
  if (data) {
    return data.node_name;
  }
  return id;
};

const PrettyName = ({
  id,
  nodeType,
}: {
  id: string;
  nodeType: PrettifiableNodeTypes;
}) => {
  if (nodeType === 'host') {
    return (
      <Suspense fallback={id}>
        <PrettyNameHost id={id} />
      </Suspense>
    );
  } else if (nodeType === 'containerImage') {
    return (
      <Suspense fallback={id}>
        <PrettyNameContainerImage id={id} />
      </Suspense>
    );
  } else if (nodeType === 'cluster') {
    return (
      <Suspense fallback={id}>
        <PrettyNameClusters id={id} />
      </Suspense>
    );
  } else if (nodeType === 'registryAccount') {
    return (
      <Suspense fallback={id}>
        <PrettyNameRegistryAccounts id={id} />
      </Suspense>
    );
  } else if (nodeType === 'container') {
    return (
      <Suspense fallback={id}>
        <PrettyNameContainers id={id} />
      </Suspense>
    );
  } else if (nodeType === 'pod') {
    return (
      <Suspense fallback={id}>
        <PrettyNamePod id={id} />
      </Suspense>
    );
  }
  return id;
};

export const FilterBadge = (
  props:
    | {
        label?: string;
        text: string;
        onRemove: () => void;
      }
    | {
        label: string;
        id: string;
        nodeType: PrettifiableNodeTypes;
        onRemove: () => void;
      },
) => {
  if ('id' in props) {
    return (
      <Wrapper>
        <Text>
          {props.label}: <PrettyName id={props.id} nodeType={props.nodeType} />
        </Text>
        <RemoveButton
          onClick={() => {
            props.onRemove();
          }}
        />
      </Wrapper>
    );
  }
  return (
    <Wrapper>
      <Text>
        {props.label?.length ? `${props.label}: ` : ''}
        {props.text}
      </Text>
      <RemoveButton
        onClick={() => {
          props.onRemove();
        }}
      />
    </Wrapper>
  );
};
