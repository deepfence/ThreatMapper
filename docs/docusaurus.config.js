// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/vsLight');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Deepfence ThreatMapper',
  tagline: 'Open source cloud native security observability platform. Linux, K8s, AWS Fargate and more',
  url: 'https://your-docusaurus-test-site.com',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: '/img/deepfence.png',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'facebook', // Usually your GitHub org/user name.
  projectName: 'docusaurus', // Usually your repo name.

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/ogarrett/ThreatMapper/docs/',
          breadcrumbs: true,
          routeBasePath: '/',
          // options for remark-admonitions
          admonitions: {}, 
        },
        blog: false,
        theme: {
          customCss: require.resolve('./static/css/deepfence.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        hideOnScroll: false,
        title: '',
        logo: {
          alt: 'Deepfence',
          src: '/img/deepfence-logo-black.svg',
          srcDark: '/img/deepfence-logo-white.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'threatmapper/index',
            label: 'ThreatMapper Documentation',
          },
          { 
            to: 'https://deepfence.io/',
            label: 'deepfence.io',
            position: 'right',
          },
          {
            href: 'https://github.com/deepfence',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        logo: {
          alt: 'Deepfence, Inc',
          src: '/img/deepfence-logo-white.svg',
          width: 160,
          height: 51,
        },
        copyright: `Copyright © ${new Date().getFullYear()} Deepfence, Inc. Built with Docusaurus.`,
      },
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
