import { SlidingModal } from 'ui-components';

interface FocusableElement {
  focus(options?: FocusOptions): void;
}

type SideNavProps = {
  isToggleOn: boolean;
  elementToFocusOnCloseRef: React.RefObject<FocusableElement>;
  handleToggle: () => void;
};
export const SideNav = ({
  isToggleOn,
  elementToFocusOnCloseRef,
  handleToggle,
}: SideNavProps) => {
  return (
    <SlidingModal
      open={isToggleOn}
      onOpenChange={handleToggle}
      elementToFocusOnCloseRef={elementToFocusOnCloseRef}
      direction="left"
      width="w-3/12"
    >
      <p className="dark:text-white">Dashboard</p>
      <p className="dark:text-white">Topology</p>
    </SlidingModal>
  );
};
