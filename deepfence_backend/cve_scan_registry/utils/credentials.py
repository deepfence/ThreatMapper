import requests


def get_registry_credential(credential_id, api_url, api_key):
    headers = {"Content-Type": "application/json", "deepfence-key": api_key}
    registry_credential_response = requests.post(
        "https://{0}/df-api/registry-credential".format(api_url),
        json={"credential_id": credential_id},
        headers=headers, verify=False).json()
    return registry_credential_response.get("data", {})
