const dotenv = require('dotenv');
dotenv.config({path:__dirname+ '/../../../.env'});

function node_url(networkName) {
    if (networkName) {
        const uri = process.env['ETH_NODE_URI_' + networkName.toUpperCase()];
        if (uri && uri !== '') {
            return uri;
        }
    }

    let uri = process.env.ETH_NODE_URI;
    if (uri) {
        uri = uri.replace('{{networkName}}', networkName);
    }
    if (!uri || uri === '') {
        if (networkName === 'localhost') {
            return 'http://localhost:8545';
        }
        return '';
    }
    if (uri.indexOf('{{') >= 0) {
        throw new Error(
            `invalid uri or network not supported by node provider : ${uri}`
        );
    }
    return uri;
}

function getPrivateKey(networkName) {
    if (networkName) {
        const pk = process.env['PK_' + networkName.toUpperCase()];
        if (pk && pk !== '') {
            return pk;
        }
    }

    const pk = process.env.PK;
    if (!pk || pk === '') {
        return '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; //dev private key
    }
    return pk;
}

function accounts(networkName) {
    return [getPrivateKey(networkName)];
}

function isZkSync(){
    return process.env.STAND.toLowerCase() === 'zksync';
}

function getGasPrice() {


    let gasPrice = Number.parseFloat(process.env.GAS_PRICE);

    if (gasPrice === undefined || gasPrice === 0)
        throw new Error("Unknown gasPpice");

    let wei = gasPrice * 1e9;
    console.log(`[Node] Gas price:  Gwei: [${gasPrice}] Wei: [${wei}]`);

    return wei;
}

function blockNumber(networkName) {

    if (!networkName) {
        return Number.parseInt(process.env['HARDHAT_BLOCK_NUMBER']);
    }

    const blockNumber = Number.parseInt(process.env['HARDHAT_BLOCK_NUMBER_' + networkName.toUpperCase()]);
    if (Number.isNaN(blockNumber)) {
        return 0;
    } else {
        return blockNumber;
    }
}

function getNodeUrl(){
    return node_url(process.env.ETH_NETWORK.toLowerCase());
}
function getBlockNumber(){
    return blockNumber(process.env.ETH_NETWORK.toLowerCase())
}

module.exports = {
    getNodeUrl: getNodeUrl,
    node_url: node_url,
    isZkSync: isZkSync,
    accounts: accounts,
    getGasPrice: getGasPrice,
    blockNumber: blockNumber,
    getBlockNumber: getBlockNumber,
}
