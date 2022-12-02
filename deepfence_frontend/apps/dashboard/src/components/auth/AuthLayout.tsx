import { Header } from '../header/Header';

/**
 *
 * @param children - react element to render as child
 * @returns children layout with SideNav, Header
 */

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Header />
      <div className="pt-[48px]">{children}</div>
    </>
  );
};
