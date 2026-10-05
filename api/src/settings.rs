//! User settings. Missing or unreadable files fall back to defaults, and unknown or
//! missing fields never break loading (so settings survive app upgrades).

use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::types::HumanSide;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub show_legal_moves: bool,
    pub animations: bool,
    pub sound: bool,
    /// "system", "light" or "dark".
    pub theme: String,
    pub default_difficulty: u8,
    pub default_human_side: HumanSide,
}

impl Default for Settings {
    fn default() -> Settings {
        Settings {
            show_legal_moves: true,
            animations: true,
            sound: true,
            theme: "system".to_string(),
            default_difficulty: 2,
            default_human_side: HumanSide::Black,
        }
    }
}

impl Settings {
    pub fn load(path: &Path) -> Settings {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|text| serde_json::from_str(&text).ok())
            .unwrap_or_default()
    }

    /// Writes via a temp file and rename, so a crash cannot leave a half-written file.
    pub fn save(&self, path: &Path) -> std::io::Result<()> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)?;
        }
        let tmp = path.with_extension("tmp");
        std::fs::write(&tmp, serde_json::to_string_pretty(self).expect("settings serialise"))?;
        std::fs::rename(tmp, path)
    }
}
