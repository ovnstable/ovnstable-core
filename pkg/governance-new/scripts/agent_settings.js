const {getContract, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE18} = require("@overnight-contracts/common/utils/decimals");
const {ethers} = require("hardhat");

async function main() {

    let timelock = await getContract('AgentTimelock');

    console.log('Timelock: getMinDelay:    ' + await timelock.getMinDelay());
    console.log('Timelock: gateway:        ' + await timelock.gateway());
    console.log('Timelock: ovnAgent:       ' + await timelock.ovnAgent());
    console.log('Timelock: motherTimelock: ' + await timelock.motherTimelock());
    console.log('Timelock: motherChainId:  ' + await timelock.motherChainId());

}




main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

