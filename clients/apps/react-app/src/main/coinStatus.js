import axios from 'axios'
//import config from 'config';
import SocksProxyAgentLib from 'socks-proxy-agent'

const SocksProxyAgent = SocksProxyAgentLib.SocksProxyAgent

const checkTransfer = async (statechainId, walletSettings) => {
  const statechainEntityUrl = walletSettings.statechainEntityApi //config.get('statechainEntity');
  const path = `transfer/receiver/${statechainId}`

  const torProxy = null //config.get('torProxy')

  let socksAgent = undefined

  if (torProxy) {
    socksAgent = { httpAgent: new SocksProxyAgent(torProxy) }
  }

  const response = await axios.get(statechainEntityUrl + '/' + path, socksAgent)

  if (response.status != 200) {
    return false
  }

  return response.data.transfer_complete
}

export default { checkTransfer }
