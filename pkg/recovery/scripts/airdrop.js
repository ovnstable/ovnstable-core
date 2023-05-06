const Web3 = require('web3');
const fs = require('fs');
const readline = require('readline');

const web3 = new Web3(new Web3.providers.HttpProvider('https://bsc-dataseed.binance.org/'));
const CHAIN_ID = await web3.eth.getChainId();

const ADMIN_ADDRESS = '';
const ADMIN_PRIVATE_KEY = '';

const USDP_TOKEN_CONTRACT_ADDRESS = '0x4Be42E82A3401DBBd9bF5d703F453CC26238E81d';
const AIRDROP_CONTRACT_ADDRESS = '0x46Ea118AD231Ba378c32baf32cB931D3206ec601';
const APPROVE_ABI = JSON.parse('[{"stateMutability":"nonpayable","type":"function","name":"approve","inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"outputs":[{"name":"","type":"bool"}]}]');
const AIRDROP_ABI = JSON.parse('[{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"address[]","name":"addresses","type":"address[]"},{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"name":"airdrop","outputs":[],"stateMutability":"nonpayable","type":"function"}]');
const USDP_TOKEN_CONTRACT = new web3.eth.Contract(APPROVE_ABI, USDP_TOKEN_CONTRACT_ADDRESS);
const AIRDROP_CONTRACT = new web3.eth.Contract(AIRDROP_ABI, AIRDROP_CONTRACT_ADDRESS);
const MAX_APPROVAL = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

async function main() {
    const nonce = await web3.eth.getTransactionCount(ADMIN_ADDRESS);
    const gasPrice = await web3.eth.getGasPrice();

    const approveTxn = {
        from: ADMIN_ADDRESS,
        to: USDP_TOKEN_CONTRACT_ADDRESS,
        gasPrice: gasPrice,
        nonce: nonce,
        data: USDP_TOKEN_CONTRACT.methods.approve(AIRDROP_CONTRACT_ADDRESS, MAX_APPROVAL).encodeABI(),
        chainId: CHAIN_ID
    };

    approveTxn.gas = await web3.eth.estimateGas(approveTxn);
    const signedApproveTxn = await web3.eth.accounts.signTransaction(approveTxn, '0x' + ADMIN_PRIVATE_KEY);
    const approveTxReceipt = await web3.eth.sendSignedTransaction(signedApproveTxn.rawTransaction);
    console.log(`Approve transaction successful with hash: ${approveTxReceipt.transactionHash}`);

    const airdropInfo = [];
    const rl = readline.createInterface({
        input: fs.createReadStream('OVNUSDPAirdrop.csv'),
        crlfDelay: Infinity
    });

    rl.on('line', (line) => {
        const [address, amount] = line.split(',');
        if (address !== 'Address') {
            airdropInfo.push({ address, amount: parseInt(amount) });
        }
    });

    rl.on('close', async () => {
        const addressesPerTxn = 100;
        const totalTransactions = Math.ceil(airdropInfo.length / addressesPerTxn);

        for (let i = 0; i < totalTransactions; i++) {
            const currentInfos = airdropInfo.slice(i * addressesPerTxn, (i * addressesPerTxn) + addressesPerTxn);
            const addressesList = currentInfos.map(info => web3.utils.toChecksumAddress(info.address));
            const amountsList = currentInfos.map(info => info.amount);

            const nonceAirdrop = await web3.eth.getTransactionCount(ADMIN_ADDRESS);
            const gasPriceAirdrop = await web3.eth.getGasPrice();

            const airdropTxn = {
                from: ADMIN_ADDRESS,
                to: AIRDROP_CONTRACT_ADDRESS,
                gasPrice: gasPriceAirdrop,
                nonce: nonceAirdrop,
                data: AIRDROP_CONTRACT.methods.airdrop(USDP_TOKEN_CONTRACT_ADDRESS, addressesList, amountsList).encodeABI(),
                chainId: CHAIN_ID
            };

            airdropTxn.gas = await web3.eth.estimateGas(airdropTxn);
            const signedAirdropTxn = await web3.eth.accounts.signTransaction(airdropTxn, '0x' + ADMIN_PRIVATE_KEY);
            const airdropTxReceipt = await web3.eth.sendSignedTransaction(signedAirdropTxn.rawTransaction);
            console.log(`Airdrop transaction ${i} successful with hash: ${airdropTxReceipt.transactionHash}`);
        }
    });
}

main().catch(err => {
    console.error(err);
});