const {ethers} = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createSkim, createSkimTo} = require("@overnight-contracts/common/utils/payoutListener");
const {Roles} = require("@overnight-contracts/common/utils/roles");


module.exports = async () => {

    const pl = await ethers.getContract("ArbitrumPayoutListener");

    let usdPlus = await getContract('UsdPlusToken', 'arbitrum');
    let daiPlus = await getContract('UsdPlusToken', 'arbitrum_dai');
    let etsGamma = '0x813fFCC4Af3e810E6b447235cC88A02f00454453';

    let items = [];

    items.push(...solidlizard());
    items.push(...sterling());
    items.push(...ramses());
    items.push(...arbidex());

    await (await pl.addItems(items)).wait();

    // await (await pl.grantRole(Roles.EXCHANGER, (await getContract('Exchange', 'arbitrum')).address));
    // await (await pl.grantRole(Roles.EXCHANGER, (await getContract('Exchange', 'arbitrum_dai')).address));
    // await (await pl.grantRole(Roles.EXCHANGER, '0xc2c84ca763572c6aF596B703Df9232b4313AD4e3')); // ETS Gamma

    console.log('ArbitrumPayoutListener setting done');

    function solidlizard() {

        let dex = 'SolidLizard';

        let items = [];
        items.push(createSkim('0x219fbc3ed20152a9501dDAA47F2a8C193E32D0C6', usdPlus.address, 'sAMM-USD+/USDC', dex));
        items.push(createSkim('0x2423d642C53939a463F84e14C6a9fFC6fd8f4334', usdPlus.address, 'sAMM-USD+/DAI+', dex));
        items.push(createSkim('0x2423d642C53939a463F84e14C6a9fFC6fd8f4334', daiPlus.address, 'sAMM-USD+/DAI+', dex));
        items.push(createSkim('0x97e5f60fA17816011039B908C19Fa4B43DE73731', usdPlus.address, 'sAMM-ETS Gamma/USD+', dex));
        items.push(createSkim('0x97e5f60fA17816011039B908C19Fa4B43DE73731', etsGamma, 'sAMM-ETS Gamma/USD+', dex));
        items.push(createSkim('0xff12e9b0d765d66eb950b2f8c11a356c1e09f0a1', usdPlus.address, 'sAMM-LUSD/USD+', dex));

        return items;
    }

    function sterling() {

        let dex = 'Sterling';

        let items = [];

        items.push(createSkim('0xd36A246c848714E52eD810c3f9AE60CCabfccD6B', usdPlus.address, 'sAMM-USD+/USDC', dex));
        items.push(createSkim('0xAc4eeD9Ca04B219935d5C4201167aA9257896443', usdPlus.address, 'sAMM-ETS Gamma/USD+', dex));
        items.push(createSkim('0xAc4eeD9Ca04B219935d5C4201167aA9257896443', etsGamma, 'sAMM-ETS Gamma/USD+', dex));
        items.push(createSkim('0x58C1b1d1DD5e27E929ab159f485E9625ca24969C', daiPlus.address, 'sAMM-DAI/DAI+', dex));
        items.push(createSkim('0xB6490141901FE1a16af2ADA782BA897999683757', daiPlus.address, 'sAMM-USD+/DAI+', dex));
        items.push(createSkim('0xB6490141901FE1a16af2ADA782BA897999683757', usdPlus.address, 'sAMM-USD+/DAI+', dex));

        return items;

    }

    function ramses() {

        let dex = 'Ramses';

        let items = [];

        items.push(createSkim('0xeb9153afBAa3A6cFbd4fcE39988Cea786d3F62bb', usdPlus.address, 'sAMM-USD+/DAI+', dex));
        items.push(createSkim('0xeb9153afBAa3A6cFbd4fcE39988Cea786d3F62bb', daiPlus.address, 'sAMM-USD+/DAI+', dex));
        items.push(createSkim('0x5DcE83503B114e89F180e59c444dFe814525Ae10', usdPlus.address, 'sAMM-USD+/USDC', dex));

        return items;
    }

    function arbidex() {

        let dex = 'Arbidex';
        let to = '0xE8FFE751deA181025a9ACf3D6Bde8cdA5380F53F';

        let items = [];

        items.push(createSkimTo('0xE8C060d40D7Bc96fCd5b758Bd1437C8653400b0e', usdPlus.address, 'USD+/DAI+', dex, to));
        items.push(createSkimTo('0xE8C060d40D7Bc96fCd5b758Bd1437C8653400b0e', daiPlus.address, 'USD+/DAI+', dex, to));
        items.push(createSkimTo('0xECe52B1fc32D2B4f22eb45238210b470a64bfDd5', usdPlus.address, 'USD+/USDC', dex, to));

        return items;
    }

};

module.exports.tags = ['SettingArbitrumPayoutListener'];

