import { useSelector } from 'react-redux'

export default function WalletList({ ...props }) {

    const wallets = useSelector(state => state.wallet.wallets);

    let walletList = wallets.map((wallet) => {
        return (
            <div key={wallet.name}>
                <span>Name: {wallet.name}</span> -  <span>blockheight: {wallet.blockheight}</span>
            </div>
        )
    });

    return (
        <div {...props}>
            <h2>Wallet List</h2>
            {walletList}
        </div>
    )
}