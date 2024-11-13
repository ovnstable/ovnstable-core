const { getContract, getPrice, showM2M, convertWeights, getERC20, transferAsset } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal } = require('@overnight-contracts/common/utils/governance');
const { Roles } = require('@overnight-contracts/common/utils/roles');
const { Wallets } = require('@overnight-contracts/common/utils/wallets');
const { fromE18, fromE6, toE18, toE6, fromE8 } = require('@overnight-contracts/common/utils/decimals');
const { main: payout } = require('../scripts/payout');
const { getOdosSwapData, getOdosAmountOut, getEmptyOdosData } = require('@overnight-contracts/common/utils/odos-helper');
const { ARBITRUM } = require('@overnight-contracts/common/utils/assets');

(async function main() {
    await transferAsset(ARBITRUM.usdPlus, '0x764424B7Dc62c4cB57898Ee47DcDeEe8CCC5D5b8');
})();
