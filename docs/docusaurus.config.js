// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer').themes.vsLight;
const darkCodeTheme = require('prism-react-renderer').themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Deepfence ThreatMapper',
  tagline: 'Open source cloud native security observability platform. Linux, K8s, AWS Fargate and more',
  url: 'http://threatmapper.local',
  baseUrl: '/threatmapper/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'throw',
  favicon: '/img/deepfence.png',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
    // locales: ['en', 'zh-CN', 'zh-TW'],
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
            'https://github.com/deepfence/ThreatMapper/tree/main/docs/',
          breadcrumbs: true,
          routeBasePath: 'docs',
          // options for remark-admonitions
          admonitions: {},
          // version
          lastVersion: 'current',
          versions: {
            "current": {
              label: 'v2.2',
              banner: 'none',
            },
            "v2.1": {
              label: 'v2.1',
              path: 'v2.1',
              banner: 'none',
            },
            "v2.0": {
              label: 'v2.0 (deprecated)',
              path: 'v2.0',
              banner: 'none',
            },
            "v1.5": {
              label: 'v1.5 (deprecated)',
              path: 'v1.5',
              banner: 'none',
            },
          },
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
          href: '../',
          target: '_blank',
        },
        items: [
          {
            type: 'doc',
            docId: 'index',
            label: 'ThreatMapper Documentation',
          },
          {
            type: 'docsVersionDropdown',
            position: 'left',
          },
          {
            type: 'localeDropdown',
            position: 'left',
          },
          {
            type: 'dropdown',
            label: 'Docs',
            position: 'left',
            items: [
              {
                type: 'html',
                value: '<div class="nav-dropdown-title">Open Source</div>',
              },
              {
                type: 'html',
                value: '<a class="dropdown__link" href="/threatmapper/docs">ThreatMapper</a>',
              },
              {
                type: 'html',
                value: '<a class="dropdown__link" href="/docs/secretscanner">SecretScanner</a>',
              },
              {
                type: 'html',
                value: '<a class="dropdown__link" href="/docs/yarahunter">YaraHunter</a>',
              },
              {
                type: 'html',
                value: '<a class="dropdown__link" href="/docs/packetstreamer">PacketStreamer</a>',
              },
              {
                type: 'html',
                value: '<a class="dropdown__link" href="/docs/ebpfguard">eBPFGuard</a>',
              },
              {
                type: 'html',
                value: '<a class="dropdown__link" href="/docs/flowmeter">FlowMeter</a>',
              },
              {
                type: 'html',
                value: '<div class="nav-dropdown-title">Enterprise</div>',
              },
              {
                type: 'html',
                value: '<a class="dropdown__link" href="/threatstryker/docs">ThreatStryker</a>',
              },
              {
                type: 'html',
                value: '<a class="dropdown__link" href="/threatstryker/docs/cloud">Deepfence Cloud</a>',
              },
            ],
          },
          {
            href: 'https://deepfence.io',
            position: 'right',
            className: 'header-deepfence-link',
            'aria-label': 'deepfence.io',
          },
          {
            href: 'https://github.com/deepfence',
            position: 'right',
            className: 'header-github-link',
            'aria-label': 'GitHub repository',
          }
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'GitHub',
            items: [
              {
                label: 'ThreatMapper',
                href: 'https://github.com/deepfence/ThreatMapper',
              },
              {
                label: 'SecretScanner',
                href: 'https://github.com/deepfence/SecretScanner',
              },
              {
                label: 'YaraHunter',
                href: 'https://github.com/deepfence/YaraHunter',
              },
              {
                label: 'PacketStreamer',
                href: 'https://github.com/deepfence/PacketStreamer',
              },
              {
                label: 'eBPFGuard',
                href: 'https://github.com/deepfence/ebpfguard',
              },
              {
                label: 'FlowMeter',
                href: 'https://github.com/deepfence/FlowMeter',
              },
            ],
          },
          {
            title: 'Docs',
            items: [
              {
                html: '<a class="footer__link-item" href="/threatmapper/docs">ThreatMapper</a>',
              },
              {
                html: '<a class="footer__link-item" href="/docs/secretscanner">SecretScanner</a>',
              },
              {
                html: '<a class="footer__link-item" href="/docs/yarahunter">YaraHunter</a>',
              },
              {
                html: '<a class="footer__link-item" href="/docs/packetstreamer">PacketStreamer</a>',
              },
              {
                html: '<a class="footer__link-item" href="/docs/ebpfguard">eBPFGuard</a>',
              },
              {
                html: '<a class="footer__link-item" href="/docs/flowmeter">FlowMeter</a>',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Slack',
                href: 'https://bitly.com/threatmapper-slack',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/deepfence',
              },
              {
                label: 'YouTube',
                href: 'https://www.youtube.com/channel/UCklvbuOjnzpmtXy-g97tfWQ',
              },
              {
                label: 'LinkedIn',
                href: 'https://www.linkedin.com/company/deepfence-inc',
              },
            ],
          },
          {
            title: 'Enterprise',
            items: [
              {
                label: 'ThreatStryker',
                href: 'https://deepfence.io/threatstryker',
              },
              {
                html: '<a class="footer__link-item" href="/threatstryker/docs">ThreatStryker</a>',
              },
              {
                label: 'Deepfence Cloud',
                href: 'https://deepfence.cloud',
              },
              {
                html: '<a class="footer__link-item" href="/threatstryker/docs/cloud">Deepfence Cloud Docs</a>',
              },
            ],
          },

          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                href: 'https://deepfence.io/blog',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/deepfence',
              },
            ],
          },
        ],
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
