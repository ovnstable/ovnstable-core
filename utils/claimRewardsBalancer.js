const axios = require("axios");
const {MerkleTree} = require("../utils/merkleTree");
const ethers = hre.ethers;

async function getClaimedParams(chanId, week, tokenAddress, strategyAddress) {
    console.log('chanId: ' + chanId + ' week: ' + week + ' tokenAddress: ' + tokenAddress + ' strategyAddress: ' + strategyAddress);

    let response = await axios.get('https://raw.githubusercontent.com/balancer-labs/frontend-v2/master/src/services/claim/MultiTokenClaim.json');

    let distributor;
    let manifest;
    Object.keys(response.data).forEach(function(key) {
        if (key === chanId) {
            let maxWeekStart = 0;
            let arr = response.data[key];
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].token === tokenAddress && arr[i].weekStart > maxWeekStart) {
                    distributor = arr[i].distributor;
                    manifest = arr[i].manifest;
                    maxWeekStart = arr[i].weekStart;
                    console.log('maxWeekStart: ' + maxWeekStart);
                }
            }
        }
    });

    console.log('manifest: ' + manifest);
    response = await axios.get(manifest);

    let distributionId = 0;
    Object.keys(response.data).forEach(function(key) {
        let numberKey = Number(key);
        if (numberKey > distributionId) {
            distributionId = numberKey;
        }
    });

    console.log('distributor: ' + distributor);
    console.log('distributionId: ' + distributionId);

    response = await axios.get('https://raw.githubusercontent.com/balancer-labs/bal-mining-scripts/master/reports/' + week + '/__polygon_' + tokenAddress + '.json');

    let claimedBalance;
    let elementFound;
    let elements = [];
    Object.keys(response.data).forEach(function(key) {
        let balance = toStringE18(response.data[key]);
        let element = encodeElement(key, balance);
        if (key === strategyAddress) {
            claimedBalance = balance;
            elementFound = element;
            console.log('claimedBalance: ' + claimedBalance);
            console.log('elementFound: ' + elementFound);
        }
        elements.push(element);
    });

    let merkleTree = new MerkleTree(elements);
    let merkleProof = await merkleTree.getHexProof(elementFound);
    console.log('merkleProof: ' + merkleProof);

    return new ClaimedParams(distributor, distributionId, claimedBalance, merkleProof);
}

class ClaimedParams{
    constructor(distributor, distributionId, claimedBalance, merkleProof) {
        this.distributor = distributor;
        this.distributionId = distributionId;
        this.claimedBalance = claimedBalance;
        this.merkleProof = merkleProof;
    }
}

function toStringE18(balance) {
    return balance.replace('.', '').replace(/^0+/, '') + '0000000000';
}

function encodeElement(address, balance) {
    return ethers.utils.solidityKeccak256(['address', 'uint'], [address, balance]);
}

module.exports = {
    getClaimedParams: getClaimedParams,
    ClaimedParams: ClaimedParams
}