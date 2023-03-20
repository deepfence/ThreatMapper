use std::ffi::OsStr;

use anyhow::Context;
use tokio::process::Command;

async fn supervisorctl<I, S>(args: I) -> anyhow::Result<()>
where
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    let _ = Command::new("supervisorctl").args(args).status().await?;
    Ok(())
}

pub async fn start(service: &str) -> anyhow::Result<()> {
    supervisorctl(&["start", service])
        .await
        .context("Could not start the service")
}

pub async fn stop(service: &str) -> anyhow::Result<()> {
    supervisorctl(&["stop", service])
        .await
        .context("Could not stop the service")
}

pub async fn update() -> anyhow::Result<()> {
    supervisorctl(&["reread"])
        .await
        .context("Could not reread the supervisor config")?;
    supervisorctl(&["update"])
        .await
        .context("Could not reset the programs affected by the supervisord configuration change")
}
