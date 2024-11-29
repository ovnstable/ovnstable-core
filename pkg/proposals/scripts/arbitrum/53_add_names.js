const hre = require("hardhat");
const { getContract, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus } = require("@overnight-contracts/common/utils/governance");

const path = require('path');

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'arbitrum');
    let pm_usdt = await getContract('PortfolioManager', 'arbitrum_usdt');

    const StrategySiloUsdc = await getContract('StrategySiloUsdc', 'arbitrum');
    const newSiloUsdcImpl = "0x4758241312b3682F3da773999c0D02A6FAbaA3F4";

    const StrategySiloUsdcArb = await getContract('StrategySiloUsdcArb', 'arbitrum');
    const newSiloUsdcArbImpl = "0x4758241312b3682F3da773999c0D02A6FAbaA3F4";

    const StrategySiloUsdcWbtc = await getContract('StrategySiloUsdcWbtc', 'arbitrum');
    const newSiloUsdcWbtcImpl = "0x4758241312b3682F3da773999c0D02A6FAbaA3F4";

    const StrategySperAlpha = await getContract('StrategySperAlpha', 'arbitrum');
    const newSperAlphaImpl = "0x8A0c3618e60495817170d7d36f76BD9E154612c1";

    const StrategySperGamma = await getContract('StrategySperGamma', 'arbitrum');
    const newSperGammaImpl = "0x8A0c3618e60495817170d7d36f76BD9E154612c1";

    const StrategyAaveUsdc = await getContract('StrategyAaveUsdc', 'arbitrum');
    const newAaveUsdcImpl = "0xbf208C3fe43Daf3b3CFF605b22BcB0c83A53C6aA";

    const StrategyCompoundUsdc = await getContract('StrategyCompoundUsdc', 'arbitrum');
    const newCompoundUsdcImpl = "0xA3e25Af8cb1aCa82fD017f3D08734E1A227b074A";

    const StrategyAaveUsdt = await getContract('StrategyAaveUsdt', 'arbitrum_usdt');
    const newAaveUsdtImpl = "0x586D3643a4072B99d010D510d8255B0366A55Db9";

    const StrategySiloUsdtArb = await getContract('StrategySiloUsdtArb', 'arbitrum_usdt');
    const newSiloUsdtArbImpl = "0x0c197Ef71Cd85F43F23581B60DbA2a8C9Ce0403a";

    const StrategySiloUsdtWbtc = await getContract('StrategySiloUsdtWbtc', 'arbitrum_usdt');
    const newSiloUsdtWbtcImpl = "0x0c197Ef71Cd85F43F23581B60DbA2a8C9Ce0403a";

    const StrategySperZeta = await getContract('StrategySperZeta', 'arbitrum_usdt');
    const newSperZetaImpl = "0x1Fa4538Ed6F07f7597349fbeaD5b0E4A4Ef9388c";

    const StrategySperEpsilon = await getContract('StrategySperEpsilon', 'arbitrum_usdt');
    const newSperEpsilonImpl = "0x1Fa4538Ed6F07f7597349fbeaD5b0E4A4Ef9388c";

    addProposalItem(StrategySiloUsdc, "upgradeTo", [newSiloUsdcImpl]);
    addProposalItem(StrategySiloUsdcArb, "upgradeTo", [newSiloUsdcArbImpl]);
    addProposalItem(StrategySiloUsdcWbtc, "upgradeTo", [newSiloUsdcWbtcImpl]);
    addProposalItem(StrategySperAlpha, "upgradeTo", [newSperAlphaImpl]);
    addProposalItem(StrategySperGamma, "upgradeTo", [newSperGammaImpl]);
    addProposalItem(StrategyAaveUsdc, "upgradeTo", [newAaveUsdcImpl]);
    addProposalItem(StrategyCompoundUsdc, "upgradeTo", [newCompoundUsdcImpl]);

    addProposalItem(StrategyAaveUsdt, "upgradeTo", [newAaveUsdtImpl]);
    addProposalItem(StrategySiloUsdtArb, "upgradeTo", [newSiloUsdtArbImpl]);
    addProposalItem(StrategySiloUsdtWbtc, "upgradeTo", [newSiloUsdtWbtcImpl]);
    addProposalItem(StrategySperZeta, "upgradeTo", [newSperZetaImpl]);
    addProposalItem(StrategySperEpsilon, "upgradeTo", [newSperEpsilonImpl]);
    
    addProposalItem(StrategySiloUsdc, 'setStrategyName', ["Silo USDC"]);
    addProposalItem(StrategySiloUsdcArb, 'setStrategyName', ["Silo USDC/ARB"]);
    addProposalItem(StrategySiloUsdcWbtc, 'setStrategyName', ["Silo USDC/wBTC"]);
    addProposalItem(StrategySperAlpha, 'setStrategyName', ["SperAlphaArb"]);
    addProposalItem(StrategySperGamma, 'setStrategyName', ["SperGammaArb"]);
    addProposalItem(StrategyAaveUsdc, 'setStrategyName', ["Aave USDC"]);
    addProposalItem(StrategyCompoundUsdc, 'setStrategyName', ["Compound USDC"]);

    addProposalItem(StrategyAaveUsdt, 'setStrategyName', ["Aave USDT"]);
    addProposalItem(StrategySiloUsdtArb, 'setStrategyName', ["Silo USDT/ARB"]);
    addProposalItem(StrategySiloUsdtWbtc, 'setStrategyName', ["Silo USDT/WBTC"]);
    addProposalItem(StrategySperZeta, 'setStrategyName', ["SperZetaArb"]);
    addProposalItem(StrategySperEpsilon, 'setStrategyName', ["SperEpsilonArb"]);

    addProposalItem(pm, 'upgradeTo', ['0xBB25FB79c4a111255168B563d6F640Ed9D8fe257']);
    addProposalItem(pm_usdt, 'upgradeTo', ['0xfBa189090550C2E87FA7833638C305d4c80200F2']);
    

    await testProposal(addresses, values, abis);

    await testUsdPlus(filename, 'arbitrum');
    await testUsdPlus(filename, 'arbitrum_usdt');
    
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
