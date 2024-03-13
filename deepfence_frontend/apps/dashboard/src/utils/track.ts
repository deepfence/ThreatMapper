export const track = ({
  licenseKey,
  emailDomain,
}: {
  licenseKey: string;
  emailDomain: string;
}) => {
  if (licenseKey) {
    window._paq?.push(['setCustomDimension', 1, licenseKey]);
  }
  if (emailDomain) {
    window._paq?.push(['setCustomDimension', 3, emailDomain]);
  }
  if (licenseKey || emailDomain) {
    window._paq?.push(['trackPageView']);
  }
};
