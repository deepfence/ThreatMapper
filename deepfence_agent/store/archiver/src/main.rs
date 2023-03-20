use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};

use anyhow::Context;
use async_compression::tokio::write::ZstdEncoder;
use clap::Parser;
use git2::{DescribeOptions, Repository};
use log::info;
use serde::{Deserialize, Serialize};
use tokio::{
    fs,
    io::{self, AsyncWriteExt},
};

use deepfence_agent_common::{hash::Hasher, Artifact, Artifacts};

const ZSTD_SUFFIX: &str = "zst";

#[derive(Serialize, Deserialize, Debug)]
struct Component {
    source: PathBuf,
    repository: PathBuf,
    destination: PathBuf,
    service: Option<String>,
    lockfile: Option<PathBuf>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Spec {
    #[serde(flatten)]
    components: HashMap<String, Component>,
}

#[derive(Parser, Debug)]
struct Args {
    /// Path to the agent specification.
    #[clap(short, long, default_value = "artifacts.json")]
    spec: PathBuf,

    /// Prefix directory of deepfence-agent.
    #[clap(short, long, default_value = ".")]
    prefix: PathBuf,

    /// Path to the directory to store the artifacts in.
    #[clap(short, long, default_value = "store/dist")]
    artifact_dir: PathBuf,
}

async fn compress<P, Q>(
    src_path: P,
    artifact_dir: Q,
    dst_filename: &str,
) -> Result<PathBuf, anyhow::Error>
where
    P: AsRef<Path>,
    Q: AsRef<Path>,
{
    let mut src_file = fs::File::open(src_path.as_ref())
        .await
        .context("Could not read the binary file")?;

    let dst_path = artifact_dir.as_ref().join(&dst_filename);
    let mut encoder = {
        let dst_file = fs::File::create(&dst_path)
            .await
            .context("Could not create the archive file")?;
        ZstdEncoder::new(dst_file)
    };

    io::copy(&mut src_file, &mut encoder)
        .await
        .context("Could not save the compressed data")?;

    Ok(dst_path)
}

fn get_version<P>(path: P) -> anyhow::Result<String>
where
    P: AsRef<Path>,
{
    let repo = Repository::discover(path)?;
    let tag = repo
        .describe(DescribeOptions::new().describe_tags().pattern("v*"))?
        .format(None)
        .context("Could not find the git tag")?;
    Ok(tag)
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    env_logger::init();

    let args = Args::parse();

    let spec = fs::read_to_string(&args.spec)
        .await
        .context("Could not read the spec file")?;
    let spec: Spec = serde_json::from_str(&spec).context("Could not parse the spec file")?;

    fs::create_dir_all(&args.artifact_dir)
        .await
        .context("Could not create the artifact directory")?;

    let mut hahser = Hasher::new();
    let mut artifacts = Artifacts::default();

    for (name, component) in spec.components {
        info!("Compressing {}", name);
        let filename = format!("{}.{}", name, ZSTD_SUFFIX);
        let source_path = args.prefix.join(&component.source);
        let archive_path = compress(&source_path, &args.artifact_dir, &filename).await?;

        info!("Calculating the checksum of {}", name);
        let sha512 = hahser.hash(&archive_path).await?;

        let repository_path = args.prefix.join(&component.repository);
        let version = get_version(&repository_path)?;

        artifacts.components.insert(
            name,
            Artifact {
                filename,
                sha512,
                version,
                destination: component.destination,
                service: component.service,
                lockfile: component.lockfile,
            },
        );
    }

    let json = serde_json::to_string_pretty(&artifacts)?;

    let json_path = args.artifact_dir.join("artifacts.json");
    let mut json_file = fs::File::create(&json_path).await?;
    json_file.write(json.as_bytes()).await?;

    info!(
        "All artifacts are archived and stored in {}",
        args.artifact_dir.display()
    );

    Ok(())
}
