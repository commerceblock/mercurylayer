import { useSelector } from 'react-redux'
import CreateWallet from '../components/CreateWallet';

import classes from './MainNavigation.module.css';

import { NavLink } from 'react-router-dom';

export default function MainNavigation() {
    const wallets = useSelector(state => state.wallet.wallets);

    let walletList = wallets.map((wallet) => 
        <li style={{marginBottom: 20}} key={wallet.name}>
            <NavLink
                className={({isActive}) => {
                    return isActive ? classes.active : '';
                }} 
                to={`wallets/${wallet.name}`}>{wallet.name}
            </NavLink>
        </li>
    );

    return <>
            <CreateWallet />
            <header className={classes.header}>
                <nav>
                    <ul className={classes.list}>{walletList}</ul>
                </nav>
            </header>
        </>;
}