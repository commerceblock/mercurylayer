export default function Coin({ coin }) {
    const wallets = useSelector(state => state.wallet.wallets);

    let walletList = wallets.map((wallet, index) => 
        <li key={index}>{wallet.name}</li>
    );

    return (
          
        <div>
            <h1>Wallets</h1>
            <ul>
                {walletList}
            </ul>
        </div>
    )
}