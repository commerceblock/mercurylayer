import { Link } from 'react-router-dom';
import CoinBackupTxs from './CoinBackupTxs';

export default function CoinDetails({ coin, walletName, hasLowestLocktime }) {

    const getUtxo = () => {
        console.log('coin.utxo_txid', coin.utxo_txid)
        console.log('coin.utxo_vout', coin.utxo_vout)

        if (coin.utxo_txid && (coin.utxo_vout !== undefined || coin.utxo_vout !== null)) {
            return `${coin.utxo_txid}:${coin.utxo_vout}`
        }

        return ""
    }

    return (
        <div className="card">
            <h2><b><Link to=".." relative='path'>{"<"}</Link></b> Coin Details</h2>
            <table>
                <tbody>
                    <tr>
                        <td style={{paddingRight: 20, paddingTop: 10, width:175}}>Index</td>
                        <td style={{paddingTop: 10}}>{coin.index}</td>
                    </tr>
                    <tr>
                        <td style={{paddingRight: 20, paddingTop: 10}}>User PubKey Share</td>
                        <td style={{paddingTop: 10}}>{coin.user_pubkey}</td>
                    </tr>
                    <tr>
                        <td style={{paddingRight: 20, paddingTop: 10}}>Auth PubKey</td>
                        <td style={{paddingTop: 10}}>{coin.auth_pubkey}</td>
                    </tr>
                    <tr>
                        <td style={{paddingRight: 20, paddingTop: 10}}>Derivation Path</td>
                        <td style={{paddingTop: 10}}>{coin.derivation_path}</td>
                    </tr>
                    <tr>
                        <td style={{paddingRight: 20, paddingTop: 10}}>Fingerprint</td>
                        <td style={{paddingTop: 10}}>{coin.fingerprint}</td>
                    </tr>
                    <tr>
                        <td style={{paddingRight: 20, paddingTop: 10}}>Statechain Id</td>
                        <td style={{paddingTop: 10}}>{coin.statechain_id}</td>
                    </tr>
                    <tr>
                        <td style={{paddingRight: 20, paddingTop: 10}}>SE Address</td>
                        <td style={{paddingTop: 10}}>{coin.address}</td>
                    </tr>
                    <tr>
                        <td style={{paddingRight: 20, paddingTop: 10}}>Backup Address</td>
                        <td style={{paddingTop: 10}}>{coin.backup_address}</td>
                    </tr>
                    <tr>
                        <td style={{paddingRight: 20, paddingTop: 10}}>Server PubKey Share</td>
                        <td style={{paddingTop: 10}}>{coin.server_pubkey}</td>
                    </tr>
                    <tr>
                        <td style={{paddingRight: 20, paddingTop: 10}}>Aggregated Pubkey</td>
                        <td style={{paddingTop: 10}}>{coin.aggregated_pubkey}</td>
                    </tr>
                    <tr>
                        <td style={{paddingRight: 20, paddingTop: 10}}>Aggregated Address</td>
                        <td style={{paddingTop: 10}}>{coin.aggregated_address}</td>
                    </tr>
                    <tr>
                        <td style={{paddingRight: 20, paddingTop: 10}}>Utxo</td>
                        <td style={{paddingTop: 10}}>{getUtxo()}</td>
                    </tr>
                    <tr>
                        <td style={{paddingRight: 20, paddingTop: 10}}>Amount</td>
                        <td style={{paddingTop: 10}}>{coin.amount}</td>
                    </tr>
                    <tr>
                        <td style={{paddingRight: 20, paddingTop: 10}}>Locktime</td>
                        <td style={{paddingTop: 10}}>{coin.locktime}</td>
                    </tr>
                    <tr>
                        <td style={{paddingRight: 20, paddingTop: 10}}>Withdrawal Address</td>
                        <td style={{paddingTop: 10}}>{coin.withdrawal_address}</td>
                    </tr>
                    <tr>
                        <td style={{paddingRight: 20, paddingTop: 10}}>Status</td>
                        <td style={{paddingTop: 10}}>{coin.status}</td>
                    </tr>
                </tbody>
            </table>

            {hasLowestLocktime && <>
                <h3 style={{paddingTop: 20}}>Backup Transactions</h3>
                <CoinBackupTxs coin={coin} walletName={walletName}/>
            </>}

        </div>
    )
};