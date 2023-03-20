use std::{cmp, path::PathBuf};

use anyhow::Context;
use log::{info, warn};
use reqwest::{
    header::{HeaderValue, CONTENT_LENGTH, RANGE},
    Client, StatusCode,
};
use tokio::{
    fs,
    io::AsyncWriteExt,
    time::{sleep, Duration},
};

use deepfence_agent_common::{hash::Hasher, Artifact};

use crate::{compression::decompress, lockfile::Lockfile, supervisord, version, UpdatemonError};

const TMP_PATH: &str = "/tmp/deepfence";
const CHUNK_SIZE: usize = 10240;

fn archive_path(filename: &str) -> PathBuf {
    let mut path = PathBuf::from(TMP_PATH);
    path.push(filename);
    path
}

async fn sleep_retry(e: anyhow::Error, retry_timeout: &mut u64, download_retry_timeout_max: u64) {
    warn!(
        "Failed to download a chunk, retrying in {} seconds: {:?}",
        retry_timeout, e
    );
    sleep(Duration::from_secs(*retry_timeout)).await;
    *retry_timeout = cmp::min(*retry_timeout * 2, download_retry_timeout_max);
}

async fn download_artifact(
    client: &Client,
    store_url: &str,
    download_retry_timeout_min: u64,
    download_retry_timeout_max: u64,
    remote_artifact: &Artifact,
) -> anyhow::Result<PathBuf> {
    info!("Downloading artifact {}", remote_artifact.filename);

    let artifact_url = format!("{}/{}", store_url, &remote_artifact.filename);
    let content_length = client
        .head(&artifact_url)
        .send()
        .await?
        .headers()
        .get(CONTENT_LENGTH)
        .unwrap()
        .to_str()?
        .parse::<usize>()
        .context("Could not get the content-length of the archive")?;

    let archive = archive_path(&remote_artifact.filename);
    let mut f = fs::File::create(&archive)
        .await
        .context("Could not create the archive file")?;

    for start in (0..content_length).step_by(CHUNK_SIZE) {
        let end = cmp::min(start + CHUNK_SIZE - 1, content_length);
        let header_value = HeaderValue::from_str(&format!("bytes={}-{}", start, end))
            .context("could not construct the RANGE header value")?;

        let mut retry_timeout = download_retry_timeout_min;
        loop {
            let mut response = match client
                .get(&artifact_url)
                .header(RANGE, &header_value)
                .send()
                .await
            {
                Ok(response) => response,
                Err(e) => {
                    sleep_retry(e.into(), &mut retry_timeout, download_retry_timeout_max).await;
                    continue;
                }
            };
            let status = response.status();
            match status {
                StatusCode::OK | StatusCode::PARTIAL_CONTENT => loop {
                    let chunk = match response.chunk().await {
                        Ok(chunk) => chunk,
                        Err(e) => {
                            sleep_retry(e.into(), &mut retry_timeout, download_retry_timeout_max)
                                .await;
                            continue;
                        }
                    };
                    if let Some(chunk) = chunk {
                        f.write_all(&chunk)
                            .await
                            .context("Could not write the chunk of archive")?;
                        let percent = ((end as f64 / content_length as f64) * 100.0).round() as u32;
                        if percent % 5 == 0 {
                            info!("{}: {}% downloaded", remote_artifact.filename, percent);
                        }
                    } else {
                        break;
                    }
                },
                _ => {
                    sleep_retry(
                        UpdatemonError::UnexpectedHttpStatus(status).into(),
                        &mut retry_timeout,
                        download_retry_timeout_max,
                    )
                    .await;
                    continue;
                }
            }

            break;
        }
    }

    info!("Artifact {} downloaded", remote_artifact.filename);

    Ok(archive)
}

async fn checksum_artifact(archive: &PathBuf, remote_artifact: &Artifact) -> anyhow::Result<()> {
    let mut hasher = Hasher::new();
    let sha512 = hasher.hash(&archive).await?;
    if sha512 != remote_artifact.sha512 {
        return Err(UpdatemonError::ChecksumMismatch {
            expected: remote_artifact.sha512.clone(),
            actual: sha512,
        }
        .into());
    }

    Ok(())
}

async fn start_artifact(remote_artifact: &Artifact) -> anyhow::Result<()> {
    if let Some(service) = &remote_artifact.service {
        if service == "supervisord" {
            supervisord::update().await?;
        } else {
            info!("Upgrade of {} ready, restarting", remote_artifact.filename);
            supervisord::start(service).await?;
        }
    }
    Ok(())
}

pub async fn update_artifact(
    client: &Client,
    store_url: &str,
    download_retry_timeout_min: u64,
    download_retry_timeout_max: u64,
    name: &str,
    local_artifact: &Artifact,
    remote_artifact: &Artifact,
) -> anyhow::Result<bool> {
    if !version::is_remote_newer(name, local_artifact, remote_artifact)? {
        info!("{} is up to date", name);
        return Ok(false);
    }

    let _lockfile = match &local_artifact.lockfile {
        Some(p) => match Lockfile::new(&p).await? {
            Some(lockfile) => Some(lockfile),
            // If the service is lockable and the lockfile is busy, skip the
            // upgrade.
            None => {
                info!("{} is busy, skipping upgrade for noe", name);
                return Ok(false);
            }
        },
        None => None,
    };

    let archive = download_artifact(
        client,
        store_url,
        download_retry_timeout_min,
        download_retry_timeout_max,
        remote_artifact,
    )
    .await?;
    checksum_artifact(&archive, remote_artifact).await?;

    if let Some(service) = &remote_artifact.service {
        info!("Stopping {}", service);
        supervisord::stop(service).await?;
    }

    decompress(&name, &archive, &remote_artifact.destination).await?;
    start_artifact(remote_artifact).await?;

    Ok(true)
}

pub async fn fetch_new_artifact(
    client: &Client,
    store_url: &str,
    download_retry_timeout_min: u64,
    download_retry_timeout_max: u64,
    name: &str,
    remote_artifact: &Artifact,
) -> anyhow::Result<()> {
    let archive = download_artifact(
        client,
        store_url,
        download_retry_timeout_min,
        download_retry_timeout_max,
        remote_artifact,
    )
    .await?;
    checksum_artifact(&archive, remote_artifact).await?;

    decompress(&name, archive, &remote_artifact.destination).await?;
    start_artifact(remote_artifact).await?;

    Ok(())
}
