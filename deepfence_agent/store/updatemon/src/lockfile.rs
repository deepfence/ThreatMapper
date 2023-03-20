use std::path::{Path, PathBuf};

use anyhow::Context;
use fcntl::{is_file_locked, lock_file, unlock_file};
use tokio::fs;

pub struct Lockfile {
    pub file_path: PathBuf,
    f: fs::File,
}

impl Lockfile {
    pub async fn new<P>(file_path: P) -> anyhow::Result<Option<Self>>
    where
        P: AsRef<Path>,
    {
        let file_path = file_path.as_ref().to_owned();
        let f = if file_path.exists() {
            let f = fs::File::open(&file_path)
                .await
                .context("Could not open the lockfile")?;
            if is_file_locked(&f, None)? {
                return Ok(None);
            }
            f
        } else {
            fs::File::create(&file_path)
                .await
                .context("Could not create the lockfile")?
        };

        lock_file(&f, None, Some(fcntl::FcntlLockType::Write))?;

        Ok(Some(Self { file_path, f }))
    }
}

impl Drop for Lockfile {
    fn drop(&mut self) {
        unlock_file(&self.f, None).unwrap();
    }
}
