use std::path::Path;

use anyhow::Context;
use async_compression::tokio::bufread::ZstdDecoder;
use log::info;
use tokio::{
    fs,
    io::{self, BufReader},
};

pub async fn decompress<P, Q>(name: &str, src_path: P, dst_path: Q) -> Result<(), anyhow::Error>
where
    P: AsRef<Path>,
    Q: AsRef<Path>,
{
    info!("Decompressing {}", name);

    let mut decoder = {
        let src_file = fs::File::open(src_path)
            .await
            .context("Could not read the archive file")?;
        let src_file = BufReader::new(src_file);
        ZstdDecoder::new(src_file)
    };
    let mut dst_file = fs::File::create(dst_path)
        .await
        .context("Could not open the binary destination file")?;

    io::copy(&mut decoder, &mut dst_file)
        .await
        .context("Could not decompress the archive")?;

    info!("{} decompressed", name);

    Ok(())
}
