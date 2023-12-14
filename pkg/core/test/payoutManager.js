const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts, upgrades} = require("hardhat");
const {resetHardhat, createRandomWallet} = require("@overnight-contracts/common/utils/tests");
const hre = require("hardhat");
const {constants} = require("@openzeppelin/test-helpers");
const {ZERO_ADDRESS} = constants;
const expectRevert = require("@overnight-contracts/common/utils/expectRevert");
const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach")

chai.use(require('chai-bignumber')());
const {solidity} = require("ethereum-waffle");
chai.use(solidity);

const {waffle} = require("hardhat");
const {transferETH} = require("@overnight-contracts/common/utils/script-utils");
const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {fromE6, toE6} = require("@overnight-contracts/common/utils/decimals");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {provider} = waffle;


const OPERATIONS = {
    SKIM : 0,
    SYNC : 1,
    BRIBE : 2,
    CUSTOM : 3
}

describe("PayoutManager", function () {

    let pm;
    let testAccount;
    let mockToken;
    let mockPool;
    let mockBribe;

    sharedBeforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        const {deployer} = await getNamedAccounts();

        await deployments.fixture(['DefaultPayoutManager']);

        pm = await ethers.getContract('DefaultPayoutManager');
        mockToken = await ethers.getContract('MockERC20');
        mockPool = await ethers.getContract('MockPool');
        mockBribe = await ethers.getContract('MockBribe');
        testAccount = await createRandomWallet();

        await mockPool.setToken(mockToken.address);
        await pm.grantRole(await pm.EXCHANGER(), deployer);
        await pm.grantRole(Roles.UNIT_ROLE, deployer);
        await pm.setRoleManager(pm.address);
    });


    describe('[Add/Remove]', ()=>{

        let item;

        beforeEach(async ()=>{

            item = {
                pool: '0xeb9153afBAa3A6cFbd4fcE39988Cea786d3F62bb',
                token: mockToken.address,
                poolName: 'sAMM-USD+/DAI+',
                bribe: ZERO_ADDRESS,
                operation: OPERATIONS.SKIM,
                to: testAccount.address,
                dexName: 'Ramses',
                feePercent: 0,
                feeReceiver: ZERO_ADDRESS,
                __gap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            }

            await pm.addItem(item);

        });

        it("[AddItem:Error] token is zero", async function () {
            item.token = ZERO_ADDRESS;
            await expectRevert(pm.addItem(item),'token is zero');
        });

        it("[AddItem:Error] pool is zero", async function () {
            item.pool = ZERO_ADDRESS;
            await expectRevert(pm.addItem(item),'pool is zero');
        });

        it("[AddItem:Error] to is zero", async function () {
            item.operation = OPERATIONS.SKIM;
            item.to = ZERO_ADDRESS;
            await expectRevert(pm.addItem(item),'to is zero');
        });

        it("[AddItem:Error] bribe is zero", async function () {
            item.operation = OPERATIONS.BRIBE;
            item.bribe = ZERO_ADDRESS;
            await expectRevert(pm.addItem(item),'bribe is zero');
        });

        it("Add a new item", async function () {

            let chainItem = await pm.items(0);

            expect(item.pool).to.equal(chainItem.pool);
            expect(item.token).to.equal(chainItem.token);
            expect(item.poolName).to.equal(chainItem.poolName);
            expect(item.bribe).to.equal(chainItem.bribe);
            expect(item.operation).to.equal(chainItem.operation);
            expect(item.to).to.equal(chainItem.to);
            expect(item.dexName).to.equal(chainItem.dexName);
            expect(item.feePercent).to.equal(chainItem.feePercent);
            expect(item.feeReceiver).to.equal(chainItem.feeReceiver);

            let items = await pm.getItems();

            expect(item.pool).to.equal(items[0].pool);
            expect(item.token).to.equal(items[0].token);
            expect(item.poolName).to.equal(items[0].poolName);
            expect(item.bribe).to.equal(items[0].bribe);
            expect(item.operation).to.equal(items[0].operation);
            expect(item.to).to.equal(items[0].to);
            expect(item.dexName).to.equal(items[0].dexName);
            expect(item.feePercent).to.equal(items[0].feePercent);
            expect(item.feeReceiver).to.equal(items[0].feeReceiver);
        });

        it("Add items", async function () {

            let length = await pm.getItemsLength();
            expect(1).to.equal(length);

            let secondItem = JSON.parse(JSON.stringify(item));
            secondItem.pool = '0xeb8E93A0c7504Bffd8A8fFa56CD754c63aAeBFe8';

            let tx = await (await pm.addItems([item, secondItem])).wait();

            let events = tx.events.filter((e) => e.event == 'AddItem');
            expect(2).to.equal(events.length);

            length = await pm.getItemsLength();
            expect(2).to.equal(length);
        });

        it("Add a 2 new item", async function () {

            let secondItem = JSON.parse(JSON.stringify(item));
            secondItem.pool = '0xeb8E93A0c7504Bffd8A8fFa56CD754c63aAeBFe8';

            let tx = await (await pm.addItem(secondItem)).wait();

            let event = tx.events.find((e) => e.event == 'AddItem');

            expect(secondItem.token).to.equal(event.args[0]);
            expect(secondItem.pool).to.equal(event.args[1]);

            let chainItem = await pm.items(1);

            expect(secondItem.pool).to.equal(chainItem.pool);
            expect(secondItem.token).to.equal(chainItem.token);
            expect(secondItem.poolName).to.equal(chainItem.poolName);
            expect(secondItem.bribe).to.equal(chainItem.bribe);
            expect(secondItem.operation).to.equal(chainItem.operation);
            expect(secondItem.to).to.equal(chainItem.to);
            expect(secondItem.dexName).to.equal(chainItem.dexName);
            expect(secondItem.feePercent).to.equal(chainItem.feePercent);
            expect(secondItem.feeReceiver).to.equal(chainItem.feeReceiver);

            let items = await pm.getItems();

            expect(secondItem.pool).to.equal(items[1].pool);
            expect(secondItem.token).to.equal(items[1].token);
            expect(secondItem.poolName).to.equal(items[1].poolName);
            expect(secondItem.bribe).to.equal(items[1].bribe);
            expect(secondItem.operation).to.equal(items[1].operation);
            expect(secondItem.to).to.equal(items[1].to);
            expect(secondItem.dexName).to.equal(items[1].dexName);
            expect(secondItem.feePercent).to.equal(items[1].feePercent);
            expect(secondItem.feeReceiver).to.equal(items[1].feeReceiver);
        });

        it("Replace an exist item", async function () {

            item.dexName = 'Test';
            await pm.addItem(item);

            let chainItem = await pm.items(0);

            expect(item.pool).to.equal(chainItem.pool);
            expect(item.token).to.equal(chainItem.token);
            expect(item.poolName).to.equal(chainItem.poolName);
            expect(item.bribe).to.equal(chainItem.bribe);
            expect(item.operation).to.equal(chainItem.operation);
            expect(item.to).to.equal(chainItem.to);
            expect(item.dexName).to.equal(chainItem.dexName);
            expect(item.feePercent).to.equal(chainItem.feePercent);
            expect(item.feeReceiver).to.equal(chainItem.feeReceiver);
        });

        it("Remove an exist item", async function () {

            let length = await pm.getItemsLength();
            expect(1).to.equal(length);

            let tx = await (await pm.removeItem(item.token, item.pool)).wait();
            let event = tx.events.find((e) => e.event == 'RemoveItem');
            expect(item.token).to.equal(event.args[0]);
            expect(item.pool).to.equal(event.args[1]);

            length = await pm.getItemsLength();
            expect(0).to.equal(length);

            let items = await pm.getItems();
            expect(0).to.equal(items.length);

            let foundItems = await pm.findItemsByPool(item.pool);
            expect(0).to.equal(foundItems.length);
        });

        it("[RemoveItem:Error] token is zero", async function () {
            await expectRevert(pm.removeItem(ZERO_ADDRESS, item.pool), 'token is zero');
        });

        it("[RemoveItem:Error] pool is zero", async function () {
            await expectRevert(pm.removeItem(item.token, ZERO_ADDRESS), 'pool is zero');
        });

        it("[RemoveItem:Error] item not found", async function () {
            await expectRevert(pm.removeItem(item.pool, item.pool), 'item not found');
        });

        it("Add new items and remove first item", async function () {

            let length = await pm.getItemsLength();
            expect(1).to.equal(length);

            let secondItem = JSON.parse(JSON.stringify(item));
            secondItem.pool = '0xeb8E93A0c7504Bffd8A8fFa56CD754c63aAeBFe8';

            let thirdItem = JSON.parse(JSON.stringify(item));
            thirdItem.pool = '0xBd7568d25338940ba212e3F299D2cCC138fA35F0';

            await (await pm.addItems([secondItem, thirdItem])).wait();

            length = await pm.getItemsLength();
            expect(3).to.equal(length);

            await (await pm.removeItem(secondItem.token, secondItem.pool)).wait();

            length = await pm.getItemsLength();
            expect(2).to.equal(length);

            let chainItem = await pm.items(0);
            expect(item.pool).to.equal(chainItem.pool);

            chainItem = await pm.items(1);
            expect(thirdItem.pool).to.equal(chainItem.pool);
        });

        it("Add new items and remove all", async function () {

            let length = await pm.getItemsLength();
            expect(1).to.equal(length);

            let secondItem = JSON.parse(JSON.stringify(item));
            secondItem.pool = '0xeb8E93A0c7504Bffd8A8fFa56CD754c63aAeBFe8';

            let thirdItem = JSON.parse(JSON.stringify(item));
            thirdItem.pool = '0xBd7568d25338940ba212e3F299D2cCC138fA35F0';

            await (await pm.addItems([secondItem, thirdItem])).wait();

            length = await pm.getItemsLength();
            expect(3).to.equal(length);

            await (await pm.removeItems()).wait();

            length = await pm.getItemsLength();
            expect(0).to.equal(length);
        });

        it("Add new items and find items by pool", async function () {

            let length = await pm.getItemsLength();
            expect(1).to.equal(length);

            let secondItem = JSON.parse(JSON.stringify(item));
            secondItem.pool = '0xeb8E93A0c7504Bffd8A8fFa56CD754c63aAeBFe8';

            let thirdItem = JSON.parse(JSON.stringify(item));
            thirdItem.pool = '0xBd7568d25338940ba212e3F299D2cCC138fA35F0';

            let fourthItem = JSON.parse(JSON.stringify(item));
            fourthItem.token = mockToken.address;

            await (await pm.addItems([secondItem, thirdItem, fourthItem])).wait();

            length = await pm.getItemsLength();
            expect(3).to.equal(length);

            let items = await pm.findItemsByPool(item.pool);
            expect(1).to.equal(items.length);
            expect(item.pool).to.equal(items[0].pool);

            items = await pm.findItemsByPool(secondItem.pool);
            expect(1).to.equal(items.length);
            expect(secondItem.pool).to.equal(items[0].pool);
        });


        describe('permissions', ()=>{

            it("[setDisabled] Restricted to Unit", async function () {
                await expectRevert(pm.connect(testAccount).setDisabled(true),'Restricted to Unit');
            });

            it("[setRoleManager] Restricted to admins", async function () {
                await expectRevert(pm.connect(testAccount).setRoleManager(testAccount.address),'Restricted to admins');
            });

            it("[addItem] Restricted to admins", async function () {
                await expectRevert(pm.connect(testAccount).addItem(item),'Restricted to Unit');
            });

            it("[removeItem] Restricted to admins", async function () {
                await expectRevert(pm.connect(testAccount).removeItem(item.pool, item.pool),'Restricted to Unit');
            });

            it("[addItems] Restricted to admins", async function () {
                await expectRevert(pm.connect(testAccount).addItems([item]),'Restricted to Unit');
            });

            it("[removeItems] Restricted to admins", async function () {
                await expectRevert(pm.connect(testAccount).removeItems(),'Restricted to Unit');
            });

        })

    })


    describe('[payoutDone]', ()=>{

        let item;
        let nonRebaseInfoItem;

        describe('[skim]', ()=>{

            beforeEach(async ()=>{

                item = {
                    pool: mockPool.address,
                    token: mockToken.address,
                    poolName: 'Test Pool',
                    bribe: ZERO_ADDRESS,
                    operation: OPERATIONS.SKIM,
                    to: testAccount.address,
                    dexName: 'Test Dex',
                    feePercent: 0,
                    feeReceiver: ZERO_ADDRESS,
                    __gap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                }

                nonRebaseInfoItem = {
                    pool: mockPool.address,
                    amount: toE6(10),
                    __gap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                }

                await pm.addItem(item);

            });

            it('[success] -> balance', async ()=> {

                await mockToken.mint(pm.address, toE6(10));

                expect(0).to.equal(fromE6(await mockToken.balanceOf(testAccount.address)));
                await pm.payoutDone(mockToken.address, [nonRebaseInfoItem]);
                expect(10).to.equal(fromE6(await mockToken.balanceOf(testAccount.address)));

            });

            it('[success] -> event', async ()=> {

                await mockToken.mint(pm.address, toE6(10));

                let tx = await (await pm.payoutDone(mockToken.address, [nonRebaseInfoItem])).wait();
                let event = tx.events.find((e) => e.event == 'PoolOperation');

                expect(item.dexName).to.equal(event.args[0]);
                expect('Skim').to.equal(event.args[1]);
                expect(item.poolName).to.equal(event.args[2]);
                expect(item.pool).to.equal(event.args[3]);
                expect(item.token).to.equal(event.args[4]);
                expect(10).to.equal(fromE6(event.args[5].toString()));
                expect(item.to).to.equal(event.args[6]);

            });

        });



        describe('[disabled -> true]', ()=>{

            beforeEach(async ()=>{

                item = {
                    pool: mockPool.address,
                    token: mockToken.address,
                    poolName: 'Test Pool',
                    bribe: mockBribe.address,
                    operation: OPERATIONS.BRIBE,
                    to: ZERO_ADDRESS,
                    dexName: 'Test Dex',
                    feePercent: 0,
                    feeReceiver: ZERO_ADDRESS,
                    __gap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                }
                await pm.addItem(item);
                await pm.setDisabled(true);

            });

            it('Revert: PayoutManager disabled', async ()=> {
                await expectRevert(pm.payoutDone(mockToken.address, []), 'PayoutManager disabled');

            });


        });


    });

});

