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
    // await transferETH(100, mainAddress);

    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'linea');
    let timelock = await getContract('AgentTimelock', 'linea');
    let rm = await getContract('RoleManager', 'linea');

    const StrategyMendiUsdc = await getContract('StrategyMendiUsdc', 'linea');
    const newMendiUsdcImpl = "0x39D7306c04A4a6f163733510f0910AfA765349bd";

    const StrategyEtsAlpha = await getContract("StrategyEtsAlpha", "linea");
    const newEtsAlphaImpl = "0x0A0Ff17E92A50FE4517715A1104c4D545bdd78Cc";

    let alphaParams = {
        asset: LINEA.usdc,
        rebaseToken: "0xC98C43CADfC611eABC08940a86B910C6433FA12A",
        hedgeExchanger: "0xa2dbE1D92d9C66DbB3e4C9358d91988907bC9Ad4"
    };

    addProposalItem(StrategyMendiUsdc, "upgradeTo", [newMendiUsdcImpl]);
    addProposalItem(StrategyEtsAlpha, "upgradeTo", [newEtsAlphaImpl]);
    addProposalItem(StrategyEtsAlpha, 'setParams', [alphaParams]);


    await testProposal(addresses, values, abis);
    // console.log(await StrategyAave.name());

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
