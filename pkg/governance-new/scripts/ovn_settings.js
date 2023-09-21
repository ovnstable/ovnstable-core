const {getContract, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE18} = require("@overnight-contracts/common/utils/decimals");
const {ethers} = require("hardhat");

async function main() {

    let timelock = await getContract('OvnTimelock');
    let ovnToken = await getContract('Ovn');
    let ovnGovernor = await ethers.getContractAt('OvnGovernor', '0x279a30ed284D49D32De901acfC0004B2dB1c091E');

    let wallet = await initWallet();

    console.log('OVN:      Supply  ovn: ' + fromE18(await ovnToken.totalSupply()));
    console.log('OVN:      balance ovn: ' + fromE18(await ovnToken.balanceOf(wallet.address)));
    console.log('OVN:      delegate to: ' + await ovnToken.delegates(wallet.address));
    console.log('Governor: votingPeriod: ' + await ovnGovernor.votingPeriod());
    console.log('Governor: votingDelay: ' + await ovnGovernor.votingDelay());
    console.log('Timelock: getMinDelay: ' + await timelock.getMinDelay());
}




main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

