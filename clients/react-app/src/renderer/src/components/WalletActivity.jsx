export default function WalletActivity({activity}) {
    return (
        <div style={{marginTop: 15}} className="card">
            <div><span>UTXO: {activity.utxo}</span></div>
            <div><span>Amount: {activity.amount}</span></div>
            <div><span>Action: {activity.action}</span></div>
            <div><span>Date: {activity.date}</span></div>
        </div>
    );
};