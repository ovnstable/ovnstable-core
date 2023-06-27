const {ethers} = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createSkim, createSkimTo, createSkimToWithFee, createBribe, createBribeWithFee, createSync} = require("@overnight-contracts/common/utils/payoutListener");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {COMMON} = require("@overnight-contracts/common/utils/assets");


module.exports = async () => {

    const pl = await ethers.getContract("ArbitrumPayoutListener");

    let usdPlus = await getContract('UsdPlusToken', 'arbitrum');
    let daiPlus = await getContract('UsdPlusToken', 'arbitrum_dai');
    let etsGamma = '0x813fFCC4Af3e810E6b447235cC88A02f00454453';

    let items = [];

    // items.push(...solidlizard());
    // items.push(...sterling());
    // items.push(...ramses());
     items.push(...arbidex());
//    items.push(...wombat());
//    items.push(...chronos());
//    items.push(...magicFox());
//    items.push(...camelot());

//    await (await pl.removeItem(usdPlus.address, '0xBbD7fF1728963A5Eb582d26ea90290F84E89bd66')).wait();
//    await (await pl.removeItem(usdPlus.address, '0xcd78e225E36E724c9FB4Bd8287296557D728cda7')).wait();
//    await (await pl.removeItem(usdPlus.address, '0x0D20EF7033b73Ea0c9c320304B05da82E2C14E33')).wait();
//    await (await pl.removeItem(usdPlus.address, '0xB260163158311596Ea88a700C5a30f101D072326')).wait();
//    await (await pl.removeItem(daiPlus.address, '0xB260163158311596Ea88a700C5a30f101D072326')).wait();

    // await (await pl.removeItems()).wait();
    await (await pl.addItems(items)).wait();

    // await (await pl.grantRole(Roles.EXCHANGER, (await getContract('Exchange', 'arbitrum')).address));
    // await (await pl.grantRole(Roles.EXCHANGER, (await getContract('Exchange', 'arbitrum_dai')).address));
    // await (await pl.grantRole(Roles.EXCHANGER, '0xc2c84ca763572c6aF596B703Df9232b4313AD4e3')); // ETS Gamma

    console.log('ArbitrumPayoutListener setting done');

    function auragi(){

        let dex = 'Auragi';

        let items = [];
        items.push(createSkim('0x60a3bbec81a92e8894ed112a148dfcc98f577ba1', usdPlus.address, 'USD+/DAI+', dex));
        items.push(createSkim('0x60a3bbec81a92e8894ed112a148dfcc98f577ba1', daiPlus.address, 'USD+/DAI+', dex));
        items.push(createSkim('0x700fd177226b12bda94568940c2bc6cf4c8bfd51', usdPlus.address, 'USD+/USDC', dex));
        items.push(createBribe('0x46FbEA37893B069E6341F3BDD961D13abC754dBB', usdPlus.address, 'USD+/LUSD', dex, '0xb330a4507e1a71ed20a754e2e7bc9087e421a0a0'));
        items.push(createBribe('0x84b8497556acd53ff2c5885e5e714afe1cef4ab6', usdPlus.address, 'USD+/MAI', dex, '0x185f984cb79a9f2a9d907dfcd72967233aedb997'));
        items.push(createSkim('0xcecc1ab2bd09b0b81f27a42ad86db5c8b721f584', usdPlus.address, 'FRAX/USD+', dex));

        return items;

    }

    function wombat(){

        let dex = 'Wombat';

        let items = [];
//        items.push(createSkim('0xF9C2356a21B60c0c4DDF2397f828dd158f82a274', usdPlus.address, 'FRAX/USD+', dex));
        items.push(createSkimTo('0xBd7568d25338940ba212e3F299D2cCC138fA35F0', usdPlus.address, 'LP-USD+', dex, '0xb73a962205D00E28DB4B5A400DF7E35355b61CA6'));
        items.push(createSkimTo('0x51E073D92b0c226F7B0065909440b18A85769606', daiPlus.address, 'LP-DAI+', dex, '0x71081021ff37D38Dec956386EA5E467e58714951'));

        return items;

    }

    function chronos(){

        let dex = 'Chronos';

        let items = [];
        items.push(createBribeWithFee('0xBbD7fF1728963A5Eb582d26ea90290F84E89bd66', usdPlus.address, 'DOLA/USD+', dex, '0x180d5B46dA03393F966BC8c0778B4dcC141B0e76', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0xcd78e225E36E724c9FB4Bd8287296557D728cda7', usdPlus.address, 'LUSD/USD+', dex, '0x4A9D9CF5104aCfd7dbF843e2dd483C70f4F71c30', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0x0D20EF7033b73Ea0c9c320304B05da82E2C14E33', usdPlus.address, 'FRAX/USD+', dex, '0x4a0f9C433B33173937011dc57e6856D366a6B94E', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0xB260163158311596Ea88a700C5a30f101D072326', usdPlus.address, 'USD+/DAI+', dex, '0xbCbfB90786BC1472e80C5f5a9D4059E79082eE18', 20, COMMON.rewardWallet));
        items.push(createBribeWithFee('0xB260163158311596Ea88a700C5a30f101D072326', daiPlus.address, 'USD+/DAI+', dex, '0xbCbfB90786BC1472e80C5f5a9D4059E79082eE18', 20, COMMON.rewardWallet));

        return items;

    }


    function solidlizard() {

        let dex = 'SolidLizard';

        let items = [];
        items.push(createSkim('0x219fbc3ed20152a9501dDAA47F2a8C193E32D0C6', usdPlus.address, 'sAMM-USD+/USDC', dex));
        items.push(createSkim('0x2423d642C53939a463F84e14C6a9fFC6fd8f4334', usdPlus.address, 'sAMM-USD+/DAI+', dex));
        items.push(createSkim('0x2423d642C53939a463F84e14C6a9fFC6fd8f4334', daiPlus.address, 'sAMM-USD+/DAI+', dex));
        items.push(createSkim('0x97e5f60fA17816011039B908C19Fa4B43DE73731', usdPlus.address, 'sAMM-ETS Gamma/USD+', dex));
        items.push(createSync('0x97e5f60fA17816011039B908C19Fa4B43DE73731', etsGamma, 'sAMM-ETS Gamma/USD+', dex));
        items.push(createSkim('0xff12e9b0d765d66eb950b2f8c11a356c1e09f0a1', usdPlus.address, 'sAMM-LUSD/USD+', dex));

        return items;
    }

    function sterling() {

        let dex = 'Sterling';

        let items = [];

        items.push(createSkim('0xd36A246c848714E52eD810c3f9AE60CCabfccD6B', usdPlus.address, 'sAMM-USD+/USDC', dex));
        items.push(createSkim('0xAc4eeD9Ca04B219935d5C4201167aA9257896443', usdPlus.address, 'sAMM-ETS Gamma/USD+', dex));
        items.push(createSync('0xAc4eeD9Ca04B219935d5C4201167aA9257896443', etsGamma, 'sAMM-ETS Gamma/USD+', dex));
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

        items.push(createSkimToWithFee('0xE8C060d40D7Bc96fCd5b758Bd1437C8653400b0e', usdPlus.address, 'USD+/DAI+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0xE8C060d40D7Bc96fCd5b758Bd1437C8653400b0e', daiPlus.address, 'USD+/DAI+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0xECe52B1fc32D2B4f22eb45238210b470a64bfDd5', usdPlus.address, 'USD+/USDC', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0xEa5f97aab76E397E4089137345c38b5c4e7939B3', usdPlus.address, 'USD+/WETH', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0xeE5e74Dc56594d070E0827ec270F974A68EBAF22', daiPlus.address, 'DAI/DAI+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0xb0Fb1787238879171Edc30b9730968600D55762A', usdPlus.address, 'FRAX/USD+', dex, to, 20, COMMON.rewardWallet));
        items.push(createSkimToWithFee('0x306132b6147751B85E608B4C1EC452E111531eA2', daiPlus.address, 'FRAX/DAI+', dex, to, 20, COMMON.rewardWallet));

        return items;
    }

    function magicFox() {

        let dex = 'MagicFox';

        let items = [];

        items.push(createSkim('0xb5218593C5d7fcdb4Ae0C11B30d9181dfE010bBD', usdPlus.address, 'sAMM-USD+/DAI+', dex));
        items.push(createSkim('0xb5218593C5d7fcdb4Ae0C11B30d9181dfE010bBD', daiPlus.address, 'sAMM-USD+/DAI+', dex));

        return items;
    }

    function camelot() {

        let dex = 'Camelot';

        let items = [];

        items.push(createSkim('0xC774924Edb53658241dB89924fA7BC704f25fc52', usdPlus.address, 'USDs/USD+', dex));

        return items;
    }

};

module.exports.tags = ['SettingArbitrumPayoutListener'];

