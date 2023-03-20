use std::path::Path;

use anyhow::Context;
use sha2::{Digest, Sha512};
use tokio::fs;

pub struct Hasher {
    inner: Sha512,
}

impl Hasher {
    pub fn new() -> Self {
        Self {
            inner: Sha512::new(),
        }
    }

    pub async fn hash<P>(&mut self, path: P) -> anyhow::Result<String>
    where
        P: AsRef<Path>,
    {
        let bytes_in = fs::read(path)
            .await
            .context("Could not read the archive to calculate the hash for")?;

        self.inner.update(&bytes_in);
        let bytes_out = &self.inner.finalize_reset();

        let mut hex_string = String::with_capacity(bytes_out.len() * 2);
        for byte in bytes_out {
            hex_string.push_str(&format!("{:02x}", byte));
        }
        Ok(hex_string)
    }
}
