---
title: Linux Host
---

# Linux Host

On a Linux-based bare-metal or virtual machine workload, the ThreatMapper sensor agents are deployed as a linux binary.

## ThreatMapper Sensor Agents

Install a docker runtime on the Linux host. Refer to the [Prerequisites for the Sensor Agents](/docs/architecture#threatmapper-sensor-containers) for minimum supported platforms.

* Copy the following shell script and save as `install_deepfence.sh`
```bash
#!/bin/bash

# MGMT_CONSOLE_URL: Example: threatmapper.customer.com or 65.65.65.65
export MGMT_CONSOLE_URL="${MGMT_CONSOLE_URL}"
export DEEPFENCE_KEY="${DEEPFENCE_KEY}"

if [[ -z "$MGMT_CONSOLE_URL" ]]; then
  echo "env MGMT_CONSOLE_URL is not set"
  exit 1
fi

if [[ -z "$DEEPFENCE_KEY" ]]; then
  echo "env DEEPFENCE_KEY is not set"
  exit 1
fi

export MGMT_CONSOLE_PORT="443"
export MGMT_CONSOLE_URL_SCHEMA="https"
export DF_HOSTNAME="$(hostname)"
export DF_LOG_LEVEL="info"

MANAGEMENT_CONSOLE_URL="$MGMT_CONSOLE_URL_SCHEMA://$MGMT_CONSOLE_URL:$MGMT_CONSOLE_PORT"

OS_ID=$(grep -oP '(?<=^ID=).+' /etc/os-release | tr -d '"')
if [[ "$OS_ID" == "amzn" || "$OS_ID" == "centos" ]]; then
    # Do necessary installs for Amazon Linux
    yum -y install logrotate jq curl
    if [[ "$?" != "0" ]]; then
        echo "Failed to install logrotate"
        exit 1
    fi
else
    # Do necessary installs for Ubuntu
    apt-get -y install logrotate jq curl
    if [[ "$?" != "0" ]]; then
        echo "Failed to install logrotate"
        exit 1
    fi
fi

access_token_response=$(curl -m 5 -s -k "$MANAGEMENT_CONSOLE_URL/deepfence/auth/token" \
        --header 'Content-Type: application/json' \
        --data "{\"api_token\": \"$DEEPFENCE_KEY\"}")
if [[ $access_token_response == "" ]]; then
  echo "Failed to connect to the management console"
  exit 1
fi

access_token=$(jq -r '.access_token' <<< "$access_token_response")
if [[ $access_token == "" || $access_token == "null" ]]; then
  echo "Failed to authenticate"
  echo "$access_token_response"
  exit 1
fi

download_url_response=$(curl -m 5 -s -k "$MANAGEMENT_CONSOLE_URL/deepfence/agent-deployment/binary/download-url" \
        --header "Authorization: Bearer $access_token")
if [[ $download_url_response == "" ]]; then
  echo "Failed to get agent binary download url"
  exit 1
fi

start_agent_script_download_url=$(jq -r '.start_agent_script_download_url' <<< "$download_url_response")
if [[ $start_agent_script_download_url == "" ]]; then
  echo "Failed to get agent binary download url"
  echo "$download_url_response"
  exit 1
fi

uninstall_agent_script_download_url=$(jq -r '.uninstall_agent_script_download_url' <<< "$download_url_response")
if [[ $uninstall_agent_script_download_url == "" ]]; then
  echo "Failed to get agent binary download url"
  echo "$download_url_response"
  exit 1
fi
curl -k -o uninstall_deepfence.sh "$uninstall_agent_script_download_url"
chmod +x uninstall_deepfence.sh

echo "Uninstalling existing Deepfence agent installation, if any"
systemctl stop deepfence-agent.service
systemctl disable deepfence-agent.service
rm -f /etc/systemd/system/deepfence-agent.service
bash uninstall_deepfence.sh

if [[ ! -d "/opt/deepfence" ]]; then
    mkdir -p /opt/deepfence /opt/deepfence/var/log/
fi

architecture=""
case $(uname -m) in
    i386)   architecture="386" ;;
    i686)   architecture="386" ;;
    x86_64) architecture="amd64" ;;
    arm)    dpkg --print-architecture | grep -q "arm64" && architecture="arm64" || architecture="arm" ;;
esac

echo "Detected architecture: $architecture"

agent_binary_download_url=$(jq -r --arg architecture "agent_binary_${architecture}_download_url" '.[$architecture]' <<< "$download_url_response")
agent_binary_filename=$(basename "$agent_binary_download_url")
agent_binary_filename=$(cut -f1 -d"?" <<< "$agent_binary_filename")

if [[ $agent_binary_download_url == "" || $agent_binary_filename == "" ]]; then
  echo "Failed to get agent binary download url"
  echo "$download_url_response"
  exit 1
fi

echo "Downloading agent binary from $agent_binary_download_url to /opt/deepfence/$agent_binary_filename"
curl -k -o "/opt/deepfence/$agent_binary_filename" "$agent_binary_download_url"

curl -k -o /opt/deepfence/start_deepfence_agent.sh "$start_agent_script_download_url"
chmod +x "/opt/deepfence/start_deepfence_agent.sh"

tar -xzf "/opt/deepfence/$agent_binary_filename" -C /opt/deepfence/

echo "MGMT_CONSOLE_URL: $MGMT_CONSOLE_URL"
echo "MGMT_CONSOLE_PORT: $MGMT_CONSOLE_PORT"
echo "DF_HOSTNAME: $DF_HOSTNAME"

echo "Installing Deepfence agent as daemon service"

cat << EOF > /etc/systemd/system/deepfence-agent.service
[Unit]
Description=Deepfence Agent Service
After=network.target

[Service]
Environment=MGMT_CONSOLE_URL="$MGMT_CONSOLE_URL"
Environment=DEEPFENCE_KEY="$DEEPFENCE_KEY"
Environment=MGMT_CONSOLE_PORT="$MGMT_CONSOLE_PORT"
Environment=MGMT_CONSOLE_URL_SCHEMA="$MGMT_CONSOLE_URL_SCHEMA"
Environment=DF_HOSTNAME="$(hostname)"
Environment=DF_LOG_LEVEL="$DF_LOG_LEVEL"

User=root
Group=root
Restart=on-failure
Type=forking
ExecStart=/opt/deepfence/start_deepfence_agent.sh
WorkingDirectory=/opt/deepfence

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable deepfence-agent.service
systemctl start deepfence-agent.service
systemctl status deepfence-agent.service
```

* Set management console URL and Deepfence key. You can find the Deepfence API key under
  `Setting>User Management>API Key`
* You can run this script as following
```bash
sudo bash install_deepfence.sh
```

## Logs

To get the service logs, run the following command
```shell
sudo journalctl -u deepfence-agent.service
```

## Uninstall

To uninstall deepfence agent, run the following commands
```shell
sudo systemctl stop deepfence-agent.service
sudo systemctl disable deepfence-agent.service
sudo rm -f /etc/systemd/system/deepfence-agent.service
sudo bash uninstall_deepfence.sh
```
