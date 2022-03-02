const dotenv = require('dotenv');
dotenv.config();

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
        return '0xdf5D41F42f5E4571b35A6A3cdaB994e9B433Fe66';
    }
    return pk;
}


function accounts(networkName) {
    return [getPrivateKey(networkName)];
}

function getGasPrice(){

    let gasPrice = 50000000000; //50 gwei

    if (process.env.GAS_PRICE){
        gasPrice = Number.parseInt(process.env.GAS_PRICE);
        console.log('Use GAS_PRICE: ' + gasPrice);
    }

    return gasPrice;
}

function blockNumber(){

    let blockNumber;
    if (process.env.HARDHAT_BLOCK_NUMBER){
        blockNumber = Number.parseInt(process.env.HARDHAT_BLOCK_NUMBER);
        console.log('Use HARDHAT_BLOCK_NUMBERblock number: ' + blockNumber);
    }else {
        blockNumber = 25082314
        console.log('Use default block number: ' + blockNumber);
    }

    return blockNumber;
}

module.exports = {
    node_url: node_url,
    accounts: accounts,
    getGasPrice: getGasPrice,
    blockNumber: blockNumber,
}
