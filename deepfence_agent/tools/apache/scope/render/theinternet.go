package render

import (
	"net"
	"regexp"
	"strings"

	"camlistore.org/pkg/lru"

	"github.com/weaveworks/scope/report"
)

// ServiceRegexpMatcher contains ServicePrefix and service host RegExp to match with Service
type ServiceRegexpMatcher struct {
	Name          string         `json:"name,omitempty"`
	Prefix        string         `json:"prefix,omitempty"`
	RegexpMatcher *regexp.Regexp `json:"regexp_matcher,omitempty"`
}

func NewServiceRegexpMatcher(serviceName string, regExpStrings []string) ServiceRegexpMatcher {
	var srm ServiceRegexpMatcher
	srm.Name = serviceName
	srm.Prefix = strings.Join([]string{"service-", serviceName, "-"}, "")
	srm.RegexpMatcher = regexp.MustCompile(`^(.*\.)*(` + strings.Join(regExpStrings, `|`) + `)$`)
	return srm
}

var (
	// ServiceNodeIDPrefix is how the ID of all service pseudo nodes begin
	ServiceNodeIDPrefix = "service-"

	KnownServiceRegexpMatchers = []ServiceRegexpMatcher{
		//AWS Matchers
		NewServiceRegexpMatcher(report.ElasticLoadBalancing, []string{`elb\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.EBS, []string{`ebs\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.EFS, []string{`elasticfilesystem\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.FSx, []string{`fsx\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.S3, []string{`s3.*\.amazonaws\.com`, `glacier\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.Backup, []string{`backup\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.Snowball, []string{`snowball\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.StorageGateway, []string{`storagegateway\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.RDS, []string{`rds\.amazonaws\.com`, `pi\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.DynamoDB, []string{`dynamodb\.amazonaws\.com`,
			`dax\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.ElastiCache, []string{`cache\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.Elastisearch, []string{`es\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.QLDB, []string{`qldb\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.ApplicationAutoScaling, []string{
			`application-autoscaling\.amazonaws\.com`, `autoscaling\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.Lightsail, []string{`lightsail\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.AWSBatch, []string{`batch\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.ComputeOptimizer, []string{`compute-optimizer\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.ElasticBeanstalk, []string{`elasticbeanstalk.*\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.Fargate, []string{`ecs\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.Lambda, []string{`lambda\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.Outposts, []string{`outposts\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.ServerlessRepo, []string{`serverlessrepo\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.CloudDirectory, []string{`clouddirectory\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.CloudFront, []string{`cloudfront\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.Route53, []string{`route53\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.AppMesh, []string{`appmesh\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.CloudMap, []string{`servicediscovery\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.DirectConnect, []string{`directconnect\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.GlobalAccelerator, []string{`globalaccelerator\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.ElasticLoadBalancing, []string{`elasticloadbalancing\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.Cognito, []string{`cognito.*\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.Detective, []string{`detective\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.GuardDuty, []string{`guardduty\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.Inspector, []string{`inspector\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.Macie, []string{`macie2\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.Artifact, []string{`codeartifact\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.AuditManager, []string{`auditmanager\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.CertificateManager, []string{`acm\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.CloudHSM, []string{`cloudhsm.*\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.DirectoryService, []string{`ds\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.FirewallManager, []string{`fms\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.AWSIAM, []string{`iam\.amazonaws\.com`,
			`access-analyzer\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.KMS, []string{`kms\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.NetworkManager, []string{`networkmanager\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.SecretsManager, []string{`secretsmanager\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.SecurityHub, []string{`securityhub\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.Shield, []string{`shield\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.Signer, []string{`signer\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.SSO, []string{`sso\.amazonaws\.com`,
			`identitystore\.amazonaws\.com`}),
		NewServiceRegexpMatcher(report.WAF, []string{`waf.*\.amazonaws\.com`}),

		// GCP Matchers
		NewServiceRegexpMatcher(report.CloudSpanner, []string{`spanner\.googleapis\.com`}),
		NewServiceRegexpMatcher(report.CloudStorage, []string{`.*storage.*\.googleapis\.com`}),
		NewServiceRegexpMatcher(report.Filestore, []string{`file\.googleapis\.com`}),
		NewServiceRegexpMatcher(report.CloudBigtable, []string{`bigtable.*\.googleapis\.com`}),
		NewServiceRegexpMatcher(report.CloudSQL, []string{`sql.*\.googleapis\.com`}),
		NewServiceRegexpMatcher(report.Datastore, []string{`datastore\.googleapis\.com`}),
		NewServiceRegexpMatcher(report.Memorystore, []string{`memcache\.googleapis\.com`,
			`redis\.googleapis\.com`}),
		NewServiceRegexpMatcher(report.AppEngine, []string{`appengine.*\.googleapis\.com`}),
		NewServiceRegexpMatcher(report.CloudFunctions, []string{`cloudfunctions\.googleapis\.com`}),
		NewServiceRegexpMatcher(report.CloudDNS, []string{`dns\.googleapis\.com`}),
		NewServiceRegexpMatcher(report.VirtualPrivateCloud, []string{`vpcaccess\.googleapis\.com`}),
		NewServiceRegexpMatcher(report.DataLossPreventionAPI, []string{`dlp\.googleapis\.com`}),
		NewServiceRegexpMatcher(report.GCPIAM, []string{`iam.*\.googleapis\.com`,
			`identitytoolkit\.googleapis\.com`}),
		NewServiceRegexpMatcher(report.IdentityAwareProxy, []string{`iap\.googleapis\.com`}),
		NewServiceRegexpMatcher(report.CloudKMS, []string{`cloudkms\.googleapis\.com`}),
		NewServiceRegexpMatcher(report.SecurityCommandCenter, []string{`securitycenter\.googleapis\.com`}),
		NewServiceRegexpMatcher(report.WebSecurityScanner, []string{`websecurityscanner\.googleapis\.com`}),

		// Azure Matchers
		NewServiceRegexpMatcher(report.ActiveDirectory, []string{`graph\.windows\.net`}),
		NewServiceRegexpMatcher(report.AzureApiManagement, []string{`azure-api\.net`}),
		NewServiceRegexpMatcher(report.AzureBlobStorage, []string{`blob\.core\.windows\.net`}),
		NewServiceRegexpMatcher(report.AzureCDN, []string{`vo\.msecnd\.net`}),
		NewServiceRegexpMatcher(report.AzureCloudServices, []string{`cloudapp\.azure\.com`}),
		NewServiceRegexpMatcher(report.AzureContainerRegistry, []string{`azurecr\.io`}),
		NewServiceRegexpMatcher(report.AzureFiles, []string{`file\.core\.windows\.net`}),
		NewServiceRegexpMatcher(report.AzureFrontDoor, []string{`azurefd\.net`}),
		NewServiceRegexpMatcher(report.AzureManagementServices, []string{`management\.core\.windows\.net`}),
		NewServiceRegexpMatcher(report.AzureMediaServices, []string{`origin\.mediaservices\.windows\.net`}),
		NewServiceRegexpMatcher(report.AzureMobileApps, []string{`azure-mobile\.net`}),
		NewServiceRegexpMatcher(report.AzureServiceBus, []string{`servicebus\.windows\.net`}),
		NewServiceRegexpMatcher(report.AzureStackEdge, []string{`azureedge\.net`}),
		NewServiceRegexpMatcher(report.AzureQueueStorage, []string{`queue\.core\.windows\.net`}),
		NewServiceRegexpMatcher(report.AzureSQLDatabase, []string{`database\.windows\.net`}),
		NewServiceRegexpMatcher(report.AzureTableStorage, []string{`table\.core\.windows\.net`}),
		NewServiceRegexpMatcher(report.AzureTrafficManager, []string{`trafficmanager\.net`}),
		NewServiceRegexpMatcher(report.AzureWebsites, []string{`azurewebsites\.net`}),
		NewServiceRegexpMatcher(report.VisualStudioCodespaces, []string{`visualstudio\.com`}),

		// Dev tools/clouds Matchers
		NewServiceRegexpMatcher(report.Atlassian, []string{`atlassian\.net`, `atlassian\.com`, `bitbucket\.org`}),
		NewServiceRegexpMatcher(report.Bootstrap, []string{`bootstrapcdn\.com`, `getbootstrap\.com`, `bitbucket\.org`}),
		NewServiceRegexpMatcher(report.Bugsnag, []string{`bugsnag\.com`}),
		NewServiceRegexpMatcher(report.Docker, []string{`docker\.com`, `docker\.io`}),
		NewServiceRegexpMatcher(report.GitHub, []string{`github\.com`, `github\.io`, `githubapps\.com`, `\.githubassets\.com`, `\.githubusercontent\.com`}),
		NewServiceRegexpMatcher(report.Gitlab, []string{`gitlab\.com`, `gitlab-static\.com`, `gitlab\.net`, `gitlab\.io`, `gitlab.*\.com`}),
		NewServiceRegexpMatcher(report.Heroku, []string{`heroku\.com`, `herokuapp\.com`, `\.herokucdn\.com`, `\.herokussl\.com`}),
		NewServiceRegexpMatcher(report.Hostgator, []string{`^hostgator\.*`}),
		NewServiceRegexpMatcher(report.IANABlackhole, []string{`blackhole-1\.iana\.org`, `blackhole-2\.iana\.org`, `prisoner\.iana\.org`}),
		NewServiceRegexpMatcher(report.Gitlab, []string{`lencr\.org`, `letsencrypt\.org`, `lencr\.edgesuite\.net`}),
		NewServiceRegexpMatcher(report.NodeJS, []string{`nodejs\.org`}),
		NewServiceRegexpMatcher(report.NTP, []string{`ntp\.org`, `pool\.ntp\.org`}),
		NewServiceRegexpMatcher(report.ReverseDNS, []string{`in-addr\.arpa`, `ip6\.arpa`, `ipv4only\.arpa`}),

		// File sharing
		NewServiceRegexpMatcher(report.Box, []string{`(\/\/|^|\.)box\.com`, `(\/\/|^|\.)box\.net`, `(\/\/|^|\.)boxcdn\.net`}),
		NewServiceRegexpMatcher(report.Dropbox, []string{`^db\.tt`, `dropbox-dns\.com`, `dropboxapi\.com`, `dropboxstatic\.com`, `dropboxusercontent\.com`, `getdropbox\.com`}),
		NewServiceRegexpMatcher(report.FileFactory, []string{`filefactory\.com`}),
		NewServiceRegexpMatcher(report.FourShared, []string{`4shared\.com`}),
		NewServiceRegexpMatcher(report.GoogleDrive, []string{`drive\.google\.com`, `googleapis\.com\/drive`}),
		NewServiceRegexpMatcher(report.MSOnedrive, []string{`1drv\.*`, `docs\.live\.net`, `onedrive\.live\.com`, `skydrivesync\.policies\.live\.net`, `skyapi\.live\.net`}),
		NewServiceRegexpMatcher(report.Pastebin, []string{`pastebin\.com`}),

		// APM/Monitoring/Third Party
		NewServiceRegexpMatcher(report.Amazon, []string{`(\/\/|^|\.)amazon\.*`, `^(\/\/|^|\.)amazonpay\.com`, `associates-amazon\.com`}),
		NewServiceRegexpMatcher(report.AmazonAlexa, []string{`alexa\.amazon\.com`, `amazonalexa\.com`, `alexa\.amazon\.`, `avs-alexa-[0-9]+-[a-z]+\.amazon\.com`}),
		NewServiceRegexpMatcher(report.AppleAPIs, []string{`aaplimg\.com`, `apple\.com`, `apple-dns\.cn`, `appleid\.apple\.com`}),
		NewServiceRegexpMatcher(report.ATT, []string{`att-idns\.net`, `att\.com`, `ciq\.labs\.att\.com`}),
		NewServiceRegexpMatcher(report.Autodesk, []string{`autodesk\.com`}),
		NewServiceRegexpMatcher(report.DataDog, []string{`datadog\.com`}),
		NewServiceRegexpMatcher(report.FedexAPIs, []string{`fedex\.com`}),
		NewServiceRegexpMatcher(report.FreshworksAPIs, []string{`freshconnect\.io`, `freshworks\.com`, `freshworksapi\.com`}),
		NewServiceRegexpMatcher(report.GoogleCloud, []string{`cloud\.google\.com`, `cloudfunctions\.net`, `firebaseapp\.com`, `run\.app`, `metadata\.google\.internal`}),
		NewServiceRegexpMatcher(report.GoogleSuite, []string{`docs\.google\.com`, `gsuite\.google\.com`, `withgoogle\.com`, `dropboxstatic\.com`, `dropboxusercontent\.com`, `getdropbox\.com`}),
		NewServiceRegexpMatcher(report.Grafana, []string{`grafana\.com`}),
		NewServiceRegexpMatcher(report.LogicMonitor, []string{`logicmonitor\.com`}),
		NewServiceRegexpMatcher(report.NewRelic, []string{`newrelic\.com`, `nr-data\.net`}),
		NewServiceRegexpMatcher(report.OpenDNS, []string{`opendns\.com`}),
		NewServiceRegexpMatcher(report.Pingdom, []string{`^pingdom\.com`, `^pingdom\.net`}),
		NewServiceRegexpMatcher(report.Pubnub, []string{`pubnub\.com`, `pndsn\.com`}),
		NewServiceRegexpMatcher(report.Sentry, []string{`sentry-cdn\.com`, `sentry\.io`}),
		NewServiceRegexpMatcher(report.Servicenow, []string{`service-now\.com`, `servicenow\.com`}),
		NewServiceRegexpMatcher(report.Slack, []string{`slack-core\.com`, `slack-edge\.com`, `slack-files\.com`, `slack-imgs\.com`, `slack-msgs\.com`, `slack-redir\.net`, `slack\.com`, `slackb\.com`, `slack\.map\.fastly\.net`}),
		NewServiceRegexpMatcher(report.SolarWinds, []string{`cdn-sw\.net`, `controlnow\.com`, `gficloud\.com`, `loggly\.com`, `logicnow\.com`, `logicnow\.us`, `n-able\.com`, `solarwinds\.com`, `solarwindsmsp\.com`, `system-monitor\.com`, `systemmonitor\.co\.uk`, `systemmonitor\.eu\.com`, `systemmonitor\.us`}),
		NewServiceRegexpMatcher(report.Splunk, []string{`splunk\.com`, `splunkcloud\.com`}),
		NewServiceRegexpMatcher(report.Trello, []string{`trello\.com`}),
		NewServiceRegexpMatcher(report.Twilio, []string{`twilio\.com`}),
		NewServiceRegexpMatcher(report.Wix, []string{`wix\.com`, `wixapps\.net`, `wixsite\.com`, `wixstatic\.com`}),
		NewServiceRegexpMatcher(report.Wordpress, []string{`w\.org`, `wordpress\.com`, `wordpress\.org`, `wp\.com`}),
		NewServiceRegexpMatcher(report.ZenDesk, []string{`zdassets\.com`, `zendesk\.com`, `zopim\.com`}),
		NewServiceRegexpMatcher(report.Zoho, []string{`zoho\.com`, `zoho\.eu`, `zohocdn\.com`, `zohopublic\.com`, `zohostatic\.com`}),

		// Databases
		NewServiceRegexpMatcher(report.Confluent, []string{`confluent\.io`}),
		NewServiceRegexpMatcher(report.Elastic, []string{`elastic\.co`, `api\.elastic-cloud\.com`}),
		NewServiceRegexpMatcher(report.MongoDB, []string{`mongodb\.com`, `cloud\.mongodb\.com`}),
		NewServiceRegexpMatcher(report.Redis, []string{`redislabs\.com`, `api\.redislabs\.com`}),
		NewServiceRegexpMatcher(report.Snowflake, []string{`snowflake\.com`, `snowflakecomputing\.com`}),

		// CDN
		NewServiceRegexpMatcher(report.AdobeAds, []string{`acrobat\.com`, `adobe-identity\.com`, `adobe\.com`, `adobe\.io`, `adobe\.net`, `adobecc\.com`, `adobeexchange\.com`, `adobesigncdn\.com`, `typekit\.`}),
		NewServiceRegexpMatcher(report.Akamai, []string{`akamai\.com`, `akadns\.net`, `akagtm\.org`, `akadns\.net`, `akagtm\.org`, `akahost\.net`, `akam\.net`, `akamai\.com`, `akamai\.net`, `akamaiedge\.net`, `akamaihd\.net`, `akamaistream\.net`, `akamaitech\.net`, `akamaitechnologies\.com`, `akamaitechnologies\.fr`, `akamaized\.net`, `akstat\.io`, `edgekey\.net`, `edgesuite\.net`}),
		NewServiceRegexpMatcher(report.AmazonCloudfront, []string{`cloudfront\.net`}),
		NewServiceRegexpMatcher(report.AOL, []string{`adap\.tv`, `advertising\.com`, `nexage\.com`, `onebyaol\.com`, `vidible\.tv`}),
		NewServiceRegexpMatcher(report.BellCanada, []string{`bell\.ca\.akadns\.net`, `bell\.ca`}),
		NewServiceRegexpMatcher(report.BranchIO, []string{`branch\.io`}),
		NewServiceRegexpMatcher(report.CDN77, []string{`cdn77\.com`, `cdn77\.org`}),
		NewServiceRegexpMatcher(report.Changeip, []string{`changeip\.com`}),
		NewServiceRegexpMatcher(report.CloudFlare, []string{`cloudflare\.com`, `cloudflare-dns\.com`, `cloudflareinsights\.com`, `cloudflaressl\.com`}),
		NewServiceRegexpMatcher(report.Discord, []string{`discord\.com`, `discord\.gg`, `discord\.media`, `discordapp\.com`, `discordapp\.net`}),
		NewServiceRegexpMatcher(report.Discuss, []string{`disqus\.com`, `disquscdn\.com`}),
		NewServiceRegexpMatcher(report.DYN, []string{`dyn\.com`, `dyndns\.org`}),
		NewServiceRegexpMatcher(report.Fastly, []string{`fastly\.com`, `fastly\.net`, `fastlylb\.net`}),
		NewServiceRegexpMatcher(report.FontAwesome, []string{`fontawesome\.com`, `fontawesome\.com\.cdn\.cloudflare\.ne`}),
		NewServiceRegexpMatcher(report.GoDaddy, []string{`godaddy\.com\.akadns\.net`, `godaddy\.com`}),
		NewServiceRegexpMatcher(report.GoogleAds, []string{`adsense\.google\.com`, `adservice\.google\.co\.uk`, `adservice\.google\.co\.za`, `adservice\.google\.com`, `adservice\.google\.com\.gt`, `adservice\.google\.dk`, `app-measurement\.com`, `appspot\.com`, `firebase\.google\.com`, `firebaseio\.com`, `googleadservices\.com`, `googlesyndication\.com`, `mail-ads\.google\.com`}),
		NewServiceRegexpMatcher(report.GoogleAnalytics, []string{`google-analytics\.com`, `googletagmanager\.com`, `googletagservices\.com`, `ssl-google-analytics\.l\.google\.com`}),
		NewServiceRegexpMatcher(report.GoogleDomains, []string{`domains\.google`, `googledomains\.com`, `nic\.google`, `registry\.google`}),
		NewServiceRegexpMatcher(report.Hubspot, []string{`hs-analytics\.net`, `hs-banner\.com`, `hs-scripts\.com`, `hsappstatic\.net`, `hscollectedforms\.net`, `hsforms\.net`, `hubapi\.com`, `hubspot-realtime\.ably\.io`, `hubspot\.com`, `hubspot\.net`, `hubspotemail\.net`, `sidekickopen90\.com`, `usemessages\.com`}),
		NewServiceRegexpMatcher(report.Intercom, []string{`intercom\.com`, `intercom\.io`, `intercomassets\.com`, `intercomcdn\.com`}),
		NewServiceRegexpMatcher(report.Jquery, []string{`documentforce\.com`, `force\.com`, `krxd\.net`, `salesforce\.com`, `salesforcecom\.demdex\.net`, `salesforceliveagent\.com`}),
		NewServiceRegexpMatcher(report.JSDeliver, []string{`jsdelivr\.com`, `jsdelivr\.net`}),
		NewServiceRegexpMatcher(report.KeyCDN, []string{`keycdn\.com`, `kxcdn\.com`}),
		NewServiceRegexpMatcher(report.Linode, []string{`linode\.com\.cdn\.cloudflare\.net`, `linode\.com`}),
		NewServiceRegexpMatcher(report.LumenCDN, []string{`footprint\.net`}),
		NewServiceRegexpMatcher(report.Mailchimp, []string{`chimpstatic\.com`, `list-manage\.com`, `mailchimp\.com`, `mcusercontent\.com`}),
		NewServiceRegexpMatcher(report.MicrosoftTeams, []string{`api\.teams\.skype\.com`, `img\.teams\.skype\.com`, `teams\.cdn\.office\.net`, `teams\.events\.data\.microsoft\.com`, `teams\.microsoft\.com`, `teams\.microsoft\.us`, `teams\.skype\.com`}),
		NewServiceRegexpMatcher(report.Mixpanel, []string{`mixpanel\.com`}),
		NewServiceRegexpMatcher(report.NetlifyCDN, []string{`netlify\.com`}),
		NewServiceRegexpMatcher(report.Orange, []string{`francetelecom\.com`, `orange\.com`, `orange\.es`, `orange\.fr`}),
		NewServiceRegexpMatcher(report.Outbrain, []string{`outbrain\.com`, `outbrain\.org`, `outbrainimg\.com`, `zemanta\.com`}),
		NewServiceRegexpMatcher(report.Pubmatic, []string{`e6603\.b\.akamaiedge\.net`, `e6603\.g\.akamaiedge\.net`}),
		NewServiceRegexpMatcher(report.Salesforce, []string{`documentforce\.com`, `force\.com`, `krxd\.net`, `salesforce\.com`, `salesforcecom\.demdex\.net`, `salesforceliveagent\.com`}),
		NewServiceRegexpMatcher(report.Segment, []string{`segment\.com`, `segment\.io`}),
		NewServiceRegexpMatcher(report.Sendgrid, []string{`sendgrid\.com`}),
		NewServiceRegexpMatcher(report.StackPath, []string{`highwinds\.com`, `stackpath\.com`}),
		NewServiceRegexpMatcher(report.Tmobile, []string{`t-mobile\.com`}),
		NewServiceRegexpMatcher(report.Verizon, []string{`myvzw\.com`, `verizonwireless\.com`, `vzw\.com`, `vzwwo\.com`, `verizondigitalmedia\.com`}),
		NewServiceRegexpMatcher(report.Vodafone, []string{`omnitel\.it`, `vodafone\.com`, `vodafone\.de`, `vodafone\.gr`, `vodafone\.net`}),
		NewServiceRegexpMatcher(report.Yandex, []string{`yandex\.com\.tr`, `yandex\.kz`, `yandex\.net`, `yandex\.ru`, `yandex\.ua`, `yastatic\.net`}),
	}

	knownServiceExcluder = regexp.MustCompile(`^(` + strings.Join([]string{
		// We exclude ec2 machines because they are too generic
		// and having separate nodes for them makes visualizations worse
		`ec2.*\.amazonaws\.com`,
		`compute.*\.googleapis\.com`,
		`cloudapp\.net`,
	}, `|`) + `)$`)

	// Memoization for isKnownService.
	//
	// The 10000 comes from the observation that large reports contain
	// hundreds of names, and in a multi-tenant context we want to be
	// able to render a few dozen reports concurrently. Also, unlike
	// memoization in the reducers, which is keyed on reports, this
	// cache is effective when rendering multiple reports from the
	// same cluster of probes, e.g. from different points in time,
	// since names tend to change infrequently.
	//
	// Since names are generally <50 bytes, this shouldn't weight in
	// at more than a few MB of memory.
	knownServiceCache = lru.New(10000)
)

func purgeKnownServiceCache() {
	knownServiceCache = lru.New(10000)
}

// TODO: Make it user-customizable https://github.com/weaveworks/scope/issues/1876
// NB: this is a hotspot in rendering performance.
func isKnownService(hostname string) string {
	if knownServiceExcluder.MatchString(hostname) {
		knownServiceCache.Add(hostname, "")
		return ""
	}
	if v, ok := knownServiceCache.Get(hostname); ok {
		return v.(string)
	}
	for _, serviceRegexpMatcher := range KnownServiceRegexpMatchers {
		known := serviceRegexpMatcher.RegexpMatcher.MatchString(hostname)
		if known {
			knownServiceCache.Add(hostname, serviceRegexpMatcher.Prefix)
			return serviceRegexpMatcher.Prefix
		}
	}
	knownServiceCache.Add(hostname, "")
	return ""
}

// LocalNetworks returns a superset of the networks (think: CIDRs) that are
// "local" from the perspective of each host represented in the report. It's
// used to determine which nodes in the report are "remote", i.e. outside of
// our infrastructure.
func LocalNetworks(r report.Report) report.Networks {
	networks := report.MakeNetworks()

	for _, topology := range []report.Topology{r.Host, r.Overlay} {
		for _, md := range topology.Nodes {
			nets, _ := md.Sets.Lookup(report.HostLocalNetworks)
			for _, s := range nets {
				networks.AddCIDR(s)
			}
		}
	}
	if extra := kubeServiceNetwork(r.Service); extra != nil {
		networks.Add(extra)
	}
	return networks
}

// FIXME: Hideous hack to remove persistent-connection edges to
// virtual service IPs attributed to the internet. The global
// service-cluster-ip-range is not exposed by the API server (see
// https://github.com/kubernetes/kubernetes/issues/25533), so instead
// we synthesise it by computing the smallest network that contains
// all service IPs. That network may be smaller than the actual range
// but that is ok, since in the end all we care about is that it
// contains all the service IPs.
//
// The right way of fixing this is performing DNAT mapping on
// persistent connections for which we don't have a robust solution
// (see https://github.com/weaveworks/scope/issues/1491).
func kubeServiceNetwork(services report.Topology) *net.IPNet {
	serviceIPs := make([]net.IP, 0, len(services.Nodes))
	for _, md := range services.Nodes {
		serviceIP, _ := md.Latest.Lookup(report.KubernetesIP)
		if ip := net.ParseIP(serviceIP).To4(); ip != nil {
			serviceIPs = append(serviceIPs, ip)
		}
	}
	return report.ContainingIPv4Network(serviceIPs)
}
