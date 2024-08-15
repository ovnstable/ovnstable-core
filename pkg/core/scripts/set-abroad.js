const {getContract, getPrice, initWallet} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let wallet = await initWallet();
    let contract = await getContract('Exchange');
    let params = await getPrice();

    if (!(await contract.hasRole(await contract.PORTFOLIO_AGENT_ROLE(), wallet.address))){
        console.log('GrantRole PORTFOLIO_AGENT_ROLE to ' + wallet.address);

        await (await contract.grantRole(await contract.PORTFOLIO_AGENT_ROLE(), wallet.address)).wait();
    }
    await (await contract.setAbroad(1000100, 1112950, params)).wait();

    console.log('SetAbroad done()')

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
