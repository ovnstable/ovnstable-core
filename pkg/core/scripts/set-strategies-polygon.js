const {getContract, changeWeightsAndBalance, execTimelock, initWallet, convertWeights, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let weights = [
        {
            "strategy": "0x5e0d74aCeC01b8cb9623658Fc356304fEB01Aa96",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 2.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xde7d6Ee773A8a44C7a6779B40103e50Cd847EFff",
            "name": "Synapse USDC",
            "minWeight": 0,
            "targetWeight": 48.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xa7625F964C93f8A62DBed06BaFFDAF8C20025d77",
            "name": "Clear Pool USDC",
            "minWeight": 0,
            "targetWeight": 2,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x956E1DA95b339Eda148AC22158a252bf6C0a4f59",
            "name": "QuickSwapV3 USDC/USDT",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },
        {
            "strategy": "0x0dD66c4f9a739042d313d2db48Bb62aadBcFEdc2",
            "name": "Gains DAI",
            "minWeight": 0,
            "targetWeight": 27,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },
        {
            "strategy": "0xeF7913b8EBD17a725D684bf86DcAB1e9b1dB44bE",
            "name": "KyberSwap USDC",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },
        {
            "strategy": "0x03eBAAb0AF4C5450a1824B9158aC43349c61fdDa",
            "name": "Alfa WMATIC/USDC 5%/5%, 15%",
            "minWeight": 0,
            "targetWeight": 5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },
        {
            "strategy": "0x3114bfDce69a13d2258BD273D231386A074cEC48",
            "name": "Beta WMATIC/USDC 50%/100%, 2%",
            "minWeight": 0,
            "targetWeight": 5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },
        {
            "strategy": "0xA035AA89B56ab8A5b7865c936f70f02979ea5867",
            "name": "Gamma USDC/WETH 5%/5%, 10%",
            "minWeight": 0,
            "targetWeight": 5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },
        {
            "strategy": "0x0B5b9451b3b8C2Ba4e5CDF0ac6d9D05EE3ba9d30",
            "name": "Delta USDC/WETH 50%/100%, 2%",
            "minWeight": 0,
            "targetWeight": 5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },
    ]


    weights = await convertWeights(weights);

    await execTimelock(async (timelock)=>{

       await showM2M();
       let pm = await getContract('PortfolioManager');
       await pm.connect(timelock).grantRole(await pm.PORTFOLIO_AGENT_ROLE(), (await initWallet()).address);
       await pm.setStrategyWeights(weights);
       await pm.balance();
       await showM2M();
    });

    // await changeWeightsAndBalance(weights);


}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

