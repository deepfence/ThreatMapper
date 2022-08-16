import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
export function siteConfig() {
  const {siteConfig, siteMetadata} = useDocusaurusContext();
  return siteConfig;
}
export function siteMetadata() {
  const {siteConfig, siteMetadata} = useDocusaurusContext();
  return siteMetadata;
}


<h1>{siteConfig().title}</h1>

<p>{siteConfig().tagline}</p>

<span>
	<a href={siteConfig().themeConfig.navbar.items[0].docId.replace('/index', '')}>
		<div class="deepfence-button">
			{siteConfig().themeConfig.navbar.items[0].label}
		</div>
	</a>
</span>

<span>&nbsp;&nbsp;</span>

<span>
	<a href={siteConfig().presets[0][1].docs.editUrl}>
		<div class="deepfence-button">
			Edit on GitHub
		</div>
	</a>
</span>


<hr/>

<details>
	<summary>Technical Details</summary>

<details>
	<summary><b>Site Config.</b>  Site config comes from <code>docusaurus.config.js</code></summary>
	<pre>{JSON.stringify( siteConfig(), null, 2 )}</pre>
</details>


<details>
  <summary><b>Site MetaData.</b>  Site metadata comes from docusaurus install</summary>
  <pre>{JSON.stringify(siteMetadata(), null, 2) }</pre>
</details>

</details>