
export default {
    INITIALISED: "INITIALISED", //  address generated but no Tx0 yet
    IN_MEMPOOL: "IN_MEMPOOL", // Tx0 in mempool
    UNCONFIRMED: "UNCONFIRMED", // Tx0 confirmed but coin not available to be sent
    CONFIRMED: "CONFIRMED", // Tx0 confirmed and coin available to be sent
    IN_TRANSFER: "IN_TRANSFER", // transfer-sender performed, but receiver hasn't completed transfer-receiver
    WITHDRAWING: "WITHDRAWING", // withdrawal tx signed and broadcast but not yet confirmed
    TRANSFERRED: "TRANSFERRED", // the coin was transferred
    WITHDRAWN: "WITHDRAWN", // the coin was withdrawn
};
