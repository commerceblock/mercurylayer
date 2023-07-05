use config::{ConfigError, Config, File, FileFormat};

pub fn new_config() -> Result<Config, ConfigError> {
    let builder = Config::builder()
        .add_source(File::new("config/Settings.toml", FileFormat::Toml));

    builder.build()
}