const config = require('config');

const load = () => {
    return {
        confirmationTarget: config.get('confirmationTarget'),
        statechainEntity: config.get('statechainEntity'),
        torProxy: config.get('torProxy'),
        databaseFile: config.get('databaseFile'),
        electrumServer: config.get('electrumServer'),
        feeRateTolerance: config.get('feeRateTolerance'),
        network: config.get('network'),
        electrumType: config.get('electrumType'),
        maxFeeRate: config.get('maxFeeRate')
    }
}

module.exports = { load };
