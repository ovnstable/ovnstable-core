const hre = require("hardhat");
const { getContract, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require('path');
// const { strategyAerodromeUsdcParams } = require('@overnight-contracts/strategies-base/deploy/usdc/06_strategy_aeroswap_usdc');
// const { swapSimulatorAerodrome } = require('@overnight-contracts/strategies-base/deploy/usdc/07_swap_simulator');
const { BigNumber } = require("ethers");
const { BASE, COMMON } = require("@overnight-contracts/common/utils/assets");

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let wallet = (await initWallet()).address;
    // await transferETH(100, wallet);

    let addresses = [];
    let values = [];
    let abis = [];

    let fund_ex = await getContract('FundExchange', 'base');
    let newExImpl = '0x226F516fe735E24AF7e317D356c32E591910F9CB';

    let usdc = await getERC20ByAddress(BASE.usdc, wallet);
    // console.log("treasury before", (await aero.balanceOf(COMMON.rewardWallet)).toString());
    // console.log("strategy before", (await aero.balanceOf(StrategyAerodromeUsdc.address)).toString());

    addProposalItem(fund_ex, "upgradeTo", [newExImpl]);
    
    // await testProposal(addresses, values, abis); 

    // await hre.network.provider.request({
    //     method: "hardhat_impersonateAccount",
    //     params: ["0xE3Bad39b9A2330104D0399b17333d994F38C509D"],
    // });

    // const account3 = await hre.ethers.getSigner("0xE3Bad39b9A2330104D0399b17333d994F38C509D");
    // await transferETH(100, account3.address);

    // console.log("user: ", account3.address)
    // console.log("before: ", (await usdc.balanceOf(account3.address)).toString())

    // await fund_ex.connect(account3).withdraw(400_000_000n);

    // console.log("after: ", (await usdc.balanceOf(account3.address)).toString())

    await createProposal(filename, addresses, values, abis);

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
