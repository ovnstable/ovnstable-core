import Exchange from './contracts/Exchange.json'
import OvernightToken from './contracts/OvernightToken.json'
import USDCtest from './contracts/USDCtest.json'
import SimpleStorage from './contracts/SimpleStorage.json'




const options = {
    web3: {
        block: false,
        fallback: {
            type: 'ws',
            url: 'ws://127.0.0.1:8545'
        }
    },
    contracts:
        [
            SimpleStorage,
            Exchange,
            OvernightToken,
            USDCtest
        ],
    events: {
    },
    polls: {
        accounts: 5000
    }
}

export default options
