const hre = require("hardhat");
const { getContract, transferETH, initWallet, showM2M, execTimelock, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const {
    createProposal,
    testProposal,
    testUsdPlus,
    testStrategy
} = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { deployDiamond, deployFacets, prepareCut, updateFacets, updateAbi } = require("@overnight-contracts/common/utils/deployDiamond");

const path = require('path');
const { ethers } = require("hardhat");

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    // await transferETH(0.0001, "0x0000000000000000000000000000000000000000");

    const facetNames = ['PositionManagerAerodromeFacet'];

    let zap = await getContract('AerodromeCLZap', 'base');
    let cut = await prepareCut(facetNames, zap.address);
    addProposalItem(zap, 'diamondCut', [cut, ethers.constants.AddressZero, '0x']);

    await testProposal(addresses, values, abis);
    // await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

