// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/vsLight');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Deepfence ThreatMapper',
  tagline: 'Open source cloud native security observability platform. Linux, K8s, AWS Fargate and more',
  url: 'http://threatmapper.local',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',
  favicon: '/img/deepfence.png',

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
            'https://github.com/deepfence/ThreatMapper/docs/',
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
	  docs: {
	  	sidebar: {
		  hideable: true,
		},
	  },
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
