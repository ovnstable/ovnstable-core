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
            "targetWeight": 50,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xa7625F964C93f8A62DBed06BaFFDAF8C20025d77",
            "name": "Clear Pool USDC",
            "minWeight": 0,
            "targetWeight": 25,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x956E1DA95b339Eda148AC22158a252bf6C0a4f59",
            "name": "QuickSwapV3 USDC/USDT",
            "minWeight": 0,
            "targetWeight": 0.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x0dD66c4f9a739042d313d2db48Bb62aadBcFEdc2",
            "name": "Gains DAI",
            "minWeight": 0,
            "targetWeight": 19,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },

        {
            "strategy": "0xeF7913b8EBD17a725D684bf86DcAB1e9b1dB44bE",
            "name": "KyberSwap USDC",
            "minWeight": 0,
            "targetWeight": 3,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
    ]


    weights = await convertWeights(weights);

    await execTimelock(async (timelock)=>{

        await showM2M();
       let pm = await getContract('PortfolioManager');
       await pm.connect(timelock).addStrategy('0xeF7913b8EBD17a725D684bf86DcAB1e9b1dB44bE');
       await pm.connect(timelock).removeStrategy('0x8ED7b474cFE7Ef362c32ffa2FB55aF7dC87D6048');
       await pm.connect(timelock).removeStrategy('0xc1Ab7F3C4a0c9b0A1cebEf532953042bfB9ebED5');
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

