const {getContract, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE18} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let timelock = await getContract('OvnTimelockController');
    let ovnToken = await getContract('OvnToken');
    let ovnGovernor = await getContract('OvnGovernor');

    let wallet = await initWallet();

    console.log('Supply  ovn: ' + fromE18(await ovnToken.totalSupply()));
    console.log('balance ovn: ' + fromE18(await ovnToken.balanceOf(wallet.address)));
    console.log('delegate to: ' + await ovnToken.delegates(wallet.address));
    console.log('votingPeriod: ' + await ovnGovernor.votingPeriod());
    console.log('votingDelay: ' + await ovnGovernor.votingDelay());
    console.log('getMinDelay: ' + await timelock.getMinDelay());
}




main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

