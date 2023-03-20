use log::info;
use semver::Version;

use deepfence_agent_common::Artifact;

pub fn is_remote_newer(
    name: &str,
    local_artifact: &Artifact,
    remote_artifact: &Artifact,
) -> anyhow::Result<bool> {
    let remote_version = Version::parse(
        &remote_artifact
            .version
            .strip_prefix("v")
            .unwrap_or(&remote_artifact.version),
    )?;
    let local_version = Version::parse(
        &local_artifact
            .version
            .strip_prefix("v")
            .unwrap_or(&local_artifact.version),
    )?;

    let res = remote_version > local_version;
    if res {
        info!(
            "Upgrading {} from {} to {}",
            name, local_version, remote_version
        );
    }

    Ok(res)
}
