---
title: Splunk
---

# ThreatMapper and Splunk

ThreatMapper raises notifications to Splunk Workspaces using Splunk webhooks.

## To Configure Splunk Integration


1. Do Signup on splunk cloud
   ![Splunk](../img/integrations-splunk-1.png)
   ![Splunk](../img/integrations-splunk-2.png)
   ![Splunk](../img/integrations-splunk-3.png)

2. Verify Mail through link provided in signup mail from Splunk. After Verification, it will redirect to Splunk Cloud Trial Page.
   ![Splunk](../img/integrations-splunk-4.png)
   ![Splunk](../img/integrations-splunk-5.png)

3. Start trial of Splunk cloud (https://www.splunk.com/en_us/download/splunk-cloud/cloud-trial.html)
   ![Splunk](../img/integrations-splunk-6.png)

4. After trial start, Check Mail for temp credentials and splunk cloud platform url
   ![Splunk](../img/integrations-splunk-7.png)
   ![Splunk](../img/integrations-splunk-8.png)

5. Try to log in with received credentials through splunk cloud platform url
   ![Splunk](../img/integrations-splunk-9.png)
   ![Splunk](../img/integrations-splunk-10.png)
   ![Splunk](../img/integrations-splunk-11.png)
   ![Splunk](../img/integrations-splunk-12.png)
   ![Splunk](../img/integrations-splunk-13.png)
   ![Splunk](../img/integrations-splunk-14.png)
   ![Splunk](../img/integrations-splunk-15.png)
   ![Splunk](../img/integrations-splunk-16.png)
   ![Splunk](../img/integrations-splunk-17.png)
   ![Splunk](../img/integrations-splunk-18.png)
   ![Splunk](../img/integrations-splunk-19.png)
   ![Splunk](../img/integrations-splunk-20.png)
   ![Splunk](../img/integrations-splunk-21.png)
   ![Splunk](../img/integrations-splunk-22.png)

6. Final Endpoint Url: SPLUNK_CLOUD_URL:8088/services/collector/event

7. TOKEN: YOUR_GENERATED_TOKEN

8. Configure Splunk In Console
   ![Splunk](../img/integrations-splunk-23.png)
   ![Splunk](../img/integrations-splunk-24.png)

9. Now try with specific Scan(Vulnerability) according to Configured splunk integration(Vulnerability)

10. ![Splunk](../img/integrations-splunk-25.png)
