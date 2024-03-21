---
title: JIRA
---

# ThreatMapper and JIRA

ThreatMapper can be configured to raise JIRA tickets for vulnerabilities and secrets. The minimum supported version of JIRA is 7.13.

## To Configure JIRA Integration
For authentication either password of a user account or an api token can be used.

[https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)

To generate an api token:

1. Click settings icon and navigate to **Atlassian account settings**

   ![JIRA](../img/integrations-jira-1.png)

2. Once you navigate there, click **security tab**:

   ![JIRA](../img/integrations-jira-2.png)

3. Click **Create API Token** button, set label and create:

   ![JIRA](../img/integrations-jira-3.png)

4. On the Threatmapper Jira integrations page enter the jira site url, username, api token. 
   The JIRA project key is the prefix of the issue numbers , e.g. issue "JRA-123" has "JRA" as project key
   Enter the type of ticket you would want ThreatMapper to create (Task / Bug etc.):
   ![JIRA](../img/integrations-jira-4.png)
