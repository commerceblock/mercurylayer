use crate::config::Config;

pub struct StateChainEntity {
    pub config: Config,

}

impl StateChainEntity {
    pub fn new(config: Config) -> Self {
        Self {
            config,
        }
    }

    pub fn load() -> StateChainEntity {
        let config = Config::default();
        StateChainEntity::new(config)
    }
}

/*
pub fn get_server() {
    let mut sc_entity = StateChainEntity::load();
    
}
 */