use std::sync::Arc;

use anyhow::Context;
use clap::Parser;
use futures::stream::{FuturesOrdered, StreamExt};
use log::{error, info};
use reqwest::Client;

use tokio::{
    fs,
    io::AsyncWriteExt,
    time::{sleep, Duration},
};

use deepfence_agent_common::Artifacts;

use deepfence_agent_updatemon::artifact::{fetch_new_artifact, update_artifact};

const ARTIFACTS_PATH: &str = "/home/deepfence/artifacts.json";

#[derive(Parser, Debug)]
struct Args {
    /// URL to the deepfence-agent-store.
    #[clap(short, long, env = "DEEPFENCE_STORE_URL")]
    store_url: String,
    /// Duration in minutes to wait between updates.
    #[clap(
        short,
        long,
        env = "DEEPFENCE_AGENT_UPDATE_INTERVAL",
        default_value = "60"
    )]
    interval: u64,
    /// Initial timeout for retrying the download (growing exponentially).
    #[clap(
        long,
        env = "DEEPFENCE_AGENT_UPDATE_DOWNLOAD_TIMEOUT",
        default_value = "3"
    )]
    download_retry_timeout_min: u64,
    /// Maximum timeout for retrying the download (growing exponentially).
    #[clap(
        long,
        env = "DEEPFENCE_AGENT_UPDATE_DOWNLOAD_TIMEOUT_MAX",
        default_value = "90"
    )]
    download_retry_timeout_max: u64,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    env_logger::init();

    let args = Args::parse();

    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .context("Could not initialize the HTTP client")?;
    let client = Arc::new(client);
    let artifacts_url = format!("{}/artifacts.json", &args.store_url);

    loop {
        info!("Checking for updates");

        let remote_artifacts = client
            .get(&artifacts_url)
            .send()
            .await
            .context("Could not fetch the remote list of artifacts")?
            .json::<Artifacts>()
            .await
            .context("Could not parse JSON with the remote list of artifacts")?;

        let local_artifacts: Artifacts = {
            let data = fs::read_to_string(ARTIFACTS_PATH)
                .await
                .context("Could not read the local list of artifacts")?;
            serde_json::from_str(&data)
                .context("Could not parse JSON with the local list of artifacts")?
        };

        let remote_artifacts = remote_artifacts.components;
        let local_artifacts = Arc::new(local_artifacts.components);

        let mut futures: FuturesOrdered<_> = remote_artifacts
            .iter()
            .map(|(name, remote_artifact)| {
                let store_url = args.store_url.clone();
                let download_retry_timeout_min = args.download_retry_timeout_min.clone();
                let download_retry_timeout_max = args.download_retry_timeout_max.clone();
                let client = client.clone();
                let local_artifacts = local_artifacts.clone();

                let name = name.clone();
                let remote_artifact = remote_artifact.clone();

                tokio::spawn(async move {
                    match local_artifacts.get(&name) {
                        Some(local_artifact) => {
                            match update_artifact(
                                &client,
                                &store_url,
                                download_retry_timeout_min,
                                download_retry_timeout_max,
                                &name,
                                &local_artifact,
                                &remote_artifact,
                            )
                            .await
                            {
                                Ok(true) => Some((name, remote_artifact.clone())),
                                Ok(false) => Some((name, local_artifact.clone())),
                                Err(e) => {
                                    error!("Could not update artifact {}: {}", name, e);
                                    None
                                }
                            }
                        }
                        None => {
                            match fetch_new_artifact(
                                &client,
                                &store_url,
                                download_retry_timeout_min,
                                download_retry_timeout_max,
                                &name,
                                &remote_artifact,
                            )
                            .await
                            {
                                Ok(_) => Some((name, remote_artifact.clone())),
                                Err(e) => {
                                    error!("Could not fetch new artifact {}: {}", name, e);
                                    None
                                }
                            }
                        }
                    }
                })
            })
            .collect();
        let mut local_artifacts_new = Artifacts::with_capacity(remote_artifacts.len());
        loop {
            match futures.next().await {
                Some(res) => {
                    if let Some((name, artifact)) = res? {
                        local_artifacts_new
                            .components
                            .insert(name, artifact.clone());
                    }
                }
                None => {
                    break;
                }
            }
        }

        let mut f = fs::File::create(ARTIFACTS_PATH)
            .await
            .context("Could not open the local list of artifacts (for the update)")?;
        f.write_all(&serde_json::to_vec(&local_artifacts_new)?)
            .await
            .context("Could not write the local list of artifacts")?;

        sleep(Duration::from_secs(&args.interval * 60)).await;
    }
}
