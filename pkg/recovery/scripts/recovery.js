const {verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, initWallet, getERC20ByAddress, impersonateAccount} = require("@overnight-contracts/common/utils/script-utils");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {


    let wallet = '' // has USD+/DAI+ in beets pools

    await getContract()

    // Boosted Pool - Overnight Pulse
    // - linear pool USDC/wUSD+
    // - linear pool DAI/wDAI+

    // Linear pool USDC/wUSD+
    // - USDC
    // - wUSD+

    // Linear pool DAI/wDAI+
    // - USDC
    // - wUSD+

    // LP Boosted pool stake in Gauge

    // wUSD+ | wDAI+
    // - USD+
    // - DAI+


    await getBalanceBeetsGauge(wallet, 1300000);

}

function getBalance(wallet, blockNumber){





}

function getBalanceBeets(wallet){


}

function getBalanceBeetsGauge(wallet){


}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

