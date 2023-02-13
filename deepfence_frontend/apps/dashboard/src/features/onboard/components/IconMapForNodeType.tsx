import { HiOutlineCube, HiOutlineServer } from 'react-icons/hi';
import { IoImageOutline } from 'react-icons/io5';
import { SiKubernetes } from 'react-icons/si';

export const IconMapForNodeType: {
  [key: string]: JSX.Element;
} = {
  host: <HiOutlineServer />,
  container: <HiOutlineCube />,
  container_image: <IoImageOutline />,
  cluster: <SiKubernetes />,
};
