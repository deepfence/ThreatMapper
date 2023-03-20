use std::{collections::HashMap, path::PathBuf};

use serde::{Deserialize, Serialize};

pub mod hash;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Artifact {
    pub filename: String,
    pub sha512: String,
    pub version: String,
    pub destination: PathBuf,
    pub service: Option<String>,
    pub lockfile: Option<PathBuf>,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct Artifacts {
    #[serde(flatten)]
    pub components: HashMap<String, Artifact>,
}

impl Artifacts {
    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            components: HashMap::with_capacity(capacity),
        }
    }
}
