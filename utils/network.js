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
        return 'testtesttesttesttesttesttesttesttesttesttestjunk';
    }
    return pk;
}


function accounts(networkName) {

    return [getPrivateKey(networkName)];
}


module.exports = {
    node_url: node_url,
    accounts: accounts,
}
