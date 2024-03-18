---
title: Splunk
---

# ThreatMapper and Splunk

ThreatMapper sends notifications to Splunk using HTTP Event Collector.

## To Configure Splunk Integration

1. Log in to splunk cloud platform and click "Add data"
   ![Splunk](../img/integrations-splunk-13.png)
   ![Splunk](../img/integrations-splunk-14.png)

2. Choose HTTP Event Collector
   ![Splunk](../img/integrations-splunk-15.png)
   ![Splunk](../img/integrations-splunk-16.png)
   ![Splunk](../img/integrations-splunk-17.png)
   ![Splunk](../img/integrations-splunk-18.png)
   ![Splunk](../img/integrations-splunk-19.png)
   ![Splunk](../img/integrations-splunk-20.png)
   ![Splunk](../img/integrations-splunk-21.png)
   ![Splunk](../img/integrations-splunk-22.png)

3. Copy endpoint URL and the generated token: https://SPLUNK_CLOUD_URL:8088/services/collector/event

4. Configure Splunk integration in the Integrations page
   ![Splunk](../img/integrations-splunk-23.png)
   ![Splunk](../img/integrations-splunk-24.png)

5. You can search for scan results now in Splunk
   ![Splunk](../img/integrations-splunk-25.png)
