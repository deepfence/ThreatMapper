import { FaPlay } from 'react-icons/fa';
import { HiArrowLeft } from 'react-icons/hi';
import {
  Button,
  Dropdown,
  DropdownItem,
  IconButton,
  SlidingModalHeader,
} from 'ui-components';

import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { TruncatedText } from '@/components/TruncatedText';
import { getNodeImage } from '@/features/topology/utils/graph-styles';

export const Header = ({
  nodeId,
  nodeType,
  onGoBack,
  showBackBtn,
}: {
  nodeId: string;
  nodeType: string;
  onGoBack: () => void;
  showBackBtn: boolean;
}) => {
  return (
    <SlidingModalHeader>
      <div className="flex items-center justify-between pr-8">
        <div className="flex gap-2 items-center flex-1 max-w-full">
          {showBackBtn && (
            <div>
              <IconButton onClick={onGoBack} size="xs" icon={<HiArrowLeft />} />
            </div>
          )}
          <div className="w-6 h-6">
            <img src={getNodeImage(nodeType)} alt={nodeType} width="100%" height="100%" />
          </div>
          <div className="truncate flex-1">
            <TruncatedText text={nodeId} />
          </div>
          <Dropdown
            align="end"
            content={
              <>
                <DropdownItem>
                  <span className="h-6 w-6">
                    <VulnerabilityIcon />
                  </span>
                  <span>Start Vulnerability Scan</span>
                </DropdownItem>
                <DropdownItem>
                  <span className="h-6 w-6">
                    <SecretsIcon />
                  </span>
                  <span>Start Secret Scan</span>
                </DropdownItem>
                <DropdownItem>
                  <span className="h-6 w-6">
                    <MalwareIcon />
                  </span>
                  <span>Start Malware Scan</span>
                </DropdownItem>
                <DropdownItem>
                  <span className="h-6 w-6">
                    <PostureIcon />
                  </span>
                  <span>Start Compliance Scan</span>
                </DropdownItem>
              </>
            }
          >
            <Button color="primary" size="xs" startIcon={<FaPlay />} className="self-end">
              Scan
            </Button>
          </Dropdown>
        </div>
      </div>
    </SlidingModalHeader>
  );
};
