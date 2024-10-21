const { getContract, getPrice, showM2M, convertWeights, getERC20 } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal } = require('@overnight-contracts/common/utils/governance');
const { Roles } = require('@overnight-contracts/common/utils/roles');
const { Wallets } = require('@overnight-contracts/common/utils/wallets');
const { fromE18, fromE6, toE18, toE6, fromE8 } = require('@overnight-contracts/common/utils/decimals');
const { main: payout } = require('../scripts/payout');
const { getOdosSwapData, getOdosAmountOut, getEmptyOdosData } = require('@overnight-contracts/common/utils/odos-helper');

async function main() {
    const asset = await getERC20('ovn');

    const dolaBribeBalanceBefore = fromE18(
        await asset.balanceOf('0xfC996Abd85Bcf64C3fA7DA20f33278Cd46f25ab7', {
            blockTag: 21231866,
        }),
    );
    console.log('dolaBribeBalanceBefore', dolaBribeBalanceBefore);

    const dolaBribeBalanceAfter = fromE18(
        await asset.balanceOf('0xfC996Abd85Bcf64C3fA7DA20f33278Cd46f25ab7', {
            blockTag: 21231867,
        }),
    );

    console.log('dolaBribeBalanceAfter', dolaBribeBalanceAfter);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
