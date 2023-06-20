import { ContainerIcon } from '@/components/icons/container';
import { HostIcon } from '@/components/icons/host';
import { ImageIcon } from '@/components/icons/image';

export const IconMapForNodeType: {
  [key: string]: JSX.Element;
} = {
  host: <HostIcon />,
  container: <ContainerIcon />,
  container_image: <ImageIcon />,
  cluster: <ImageIcon />,
};
