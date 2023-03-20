use reqwest::StatusCode;
use thiserror::Error;

pub mod artifact;
pub mod compression;
pub mod lockfile;
pub mod version;
pub mod supervisord;

#[derive(Error, Debug)]
enum UpdatemonError {
    #[error("Unexpected HTTP status code: {0}")]
    UnexpectedHttpStatus(StatusCode),
    #[error("Checksum mismatch, expected {expected}, got {actual}")]
    ChecksumMismatch { expected: String, actual: String },
}
