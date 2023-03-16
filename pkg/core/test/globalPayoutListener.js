const {expect} = require("chai");
const chai = require("chai");
const {deployments, ethers, getNamedAccounts, upgrades} = require("hardhat");
const {resetHardhat, createRandomWallet} = require("@overnight-contracts/common/utils/tests");
const hre = require("hardhat");
let {DEFAULT} = require('@overnight-contracts/common/utils/assets');
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
const {provider} = waffle;


const OPERATIONS = {
    SKIM : 0,
    SYNC : 1,
    BRIBE : 2,
    CUSTOM : 3
}

describe("GlobalPayoutListener", function () {

    let pl;
    let testAccount;
    let mockToken;
    let mockPool;
    let mockBribe;

    sharedBeforeEach(async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        const {deployer} = await getNamedAccounts();

        await deployments.fixture(['MockGlobalPayoutListener']);

        pl = await ethers.getContract('MockGlobalPayoutListener');
        mockToken = await ethers.getContract('MockERC20');
        mockPool = await ethers.getContract('MockPool');
        mockBribe = await ethers.getContract('MockBribe');
        testAccount = await createRandomWallet();

        await mockPool.setToken(mockToken.address);
        await pl.grantRole(await pl.EXCHANGER(), deployer);
    });


    describe('[Add/Remove] ', ()=>{

        let item;

        beforeEach(async ()=>{

            item = {
                pool: '0xeb9153afBAa3A6cFbd4fcE39988Cea786d3F62bb',
                token: '0xeb8E93A0c7504Bffd8A8fFa56CD754c63aAeBFe8',
                poolName: 'sAMM-USD+/DAI+',
                bribe: ZERO_ADDRESS,
                operation: OPERATIONS.SKIM,
                to: testAccount.address,
                dexName: 'Ramses',
            }

            await pl.setItem(item);

        });

        it("[SetItem:Error] token is zero", async function () {
            item.token = ZERO_ADDRESS;
            await expectRevert(pl.setItem(item),'token is zero');
        });

        it("[SetItem:Error] pool is zero", async function () {
            item.pool = ZERO_ADDRESS;
            await expectRevert(pl.setItem(item),'pool is zero');
        });

        it("[SetItem:Error] to is zero", async function () {
            item.operation = OPERATIONS.SKIM;
            item.to = ZERO_ADDRESS;
            await expectRevert(pl.setItem(item),'to is zero');
        });

        it("[SetItem:Error] bribe is zero", async function () {
            item.operation = OPERATIONS.BRIBE;
            item.bribe = ZERO_ADDRESS;
            await expectRevert(pl.setItem(item),'bribe is zero');
        });


        it("Add a new item", async function () {

            let chainItem = await pl.items(0);

            expect(item.pool).to.equal(chainItem.pool);
            expect(item.token).to.equal(chainItem.token);
            expect(item.poolName).to.equal(chainItem.poolName);
            expect(item.bribe).to.equal(chainItem.bribe);
            expect(item.operation).to.equal(chainItem.operation);
            expect(item.to).to.equal(chainItem.to);
            expect(item.dexName).to.equal(chainItem.dexName);
        });


        it("Add a 2 new item", async function () {

            let secondItem = item;
            secondItem.pool = '0xeb8E93A0c7504Bffd8A8fFa56CD754c63aAeBFe8';

            let tx = await (await pl.setItem(secondItem)).wait();

            let event = tx.events.find((e) => e.event == 'SetItem');

            expect(secondItem.token).to.equal(event.args[0]);
            expect(secondItem.pool).to.equal(event.args[1]);

            let chainItem = await pl.items(1);

            expect(secondItem.pool).to.equal(chainItem.pool);
            expect(secondItem.token).to.equal(chainItem.token);
            expect(secondItem.poolName).to.equal(chainItem.poolName);
            expect(secondItem.bribe).to.equal(chainItem.bribe);
            expect(secondItem.operation).to.equal(chainItem.operation);
            expect(secondItem.to).to.equal(chainItem.to);
            expect(secondItem.dexName).to.equal(chainItem.dexName);
        });

        it("Replace an exist item", async function () {

            item.dexName = 'Test';
            await pl.setItem(item);

            let chainItem = await pl.items(0);

            expect(item.pool).to.equal(chainItem.pool);
            expect(item.token).to.equal(chainItem.token);
            expect(item.poolName).to.equal(chainItem.poolName);
            expect(item.bribe).to.equal(chainItem.bribe);
            expect(item.operation).to.equal(chainItem.operation);
            expect(item.to).to.equal(chainItem.to);
            expect(item.dexName).to.equal(chainItem.dexName);
        });

        it("Remove an exist item", async function () {

            let tx = await (await pl.removeItem(item.token, item.pool)).wait();
            let chainItem = await pl.items(0);
            expect(chainItem.pool).to.equal(ZERO_ADDRESS);

            let event = tx.events.find((e) => e.event == 'RemoveItem');

            expect(item.token).to.equal(event.args[0]);
            expect(item.pool).to.equal(event.args[1]);
        });




        it("[RemoveItem:Error] token is zero", async function () {
            await expectRevert(pl.removeItem(ZERO_ADDRESS, item.pool), 'token is zero');
        });

        it("[RemoveItem:Error] pool is zero", async function () {
            await expectRevert(pl.removeItem(item.token, ZERO_ADDRESS), 'pool is zero');
        });

        it("[RemoveItem:Error] item not found", async function () {
            await expectRevert(pl.removeItem(item.pool, item.pool), 'item not found');
        });





        describe('permissions', ()=>{

            it("[SetItem] Restricted to admins", async function () {
                await expectRevert(pl.connect(testAccount).setItem(item),'Restricted to admins');
            });

            it("[RemoveItem] Restricted to admins", async function () {
                await expectRevert(pl.connect(testAccount).removeItem(item.pool, item.pool),'Restricted to admins');
            });

        })

    })


    describe('[payoutDone]', ()=>{

        let item;



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
                }

                await pl.setItem(item);

            });

            it('[success] -> balance', async ()=> {

                await mockToken.mint(mockPool.address, toE6(10));

                expect(0).to.equal(fromE6(await mockToken.balanceOf(testAccount.address)));
                await pl.payoutDone(mockToken.address);
                expect(10).to.equal(fromE6(await mockToken.balanceOf(testAccount.address)));

            });

            it('[success] -> event', async ()=> {

                await mockToken.mint(mockPool.address, toE6(10));

                let tx = await (await pl.payoutDone(mockToken.address)).wait();
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

        describe('[sync]', ()=>{

            beforeEach(async ()=>{

                item = {
                    pool: mockPool.address,
                    token: mockToken.address,
                    poolName: 'Test Pool',
                    bribe: ZERO_ADDRESS,
                    operation: OPERATIONS.SYNC,
                    to: testAccount.address,
                    dexName: 'Test Dex',
                }

                await pl.setItem(item);

            });

            it('[success] -> event', async ()=> {

                let tx = await (await pl.payoutDone(mockToken.address)).wait();
                let event = tx.events.find((e) => e.event == 'PoolOperation');

                expect(item.dexName).to.equal(event.args[0]);
                expect('Sync').to.equal(event.args[1]);
                expect(item.poolName).to.equal(event.args[2]);
                expect(item.pool).to.equal(event.args[3]);
                expect(item.token).to.equal(event.args[4]);
                expect(0).to.equal(fromE6(event.args[5].toString()));
                expect(ZERO_ADDRESS).to.equal(event.args[6]);

            });

        });

        describe('[custom]', ()=>{

            beforeEach(async ()=>{

                item = {
                    pool: mockPool.address,
                    token: mockToken.address,
                    poolName: 'Test Pool',
                    bribe: ZERO_ADDRESS,
                    operation: OPERATIONS.CUSTOM,
                    to: testAccount.address,
                    dexName: 'Test Dex',
                }

                await pl.setItem(item);

            });

            it('[error] Custom not implemented', async ()=> {
                await expectRevert(pl.payoutDone(mockToken.address), 'Custom not implemented')

            });

        });



        describe('[bribe]', ()=>{

            beforeEach(async ()=>{

                item = {
                    pool: mockPool.address,
                    token: mockToken.address,
                    poolName: 'Test Pool',
                    bribe: mockBribe.address,
                    operation: OPERATIONS.BRIBE,
                    to: ZERO_ADDRESS,
                    dexName: 'Test Dex',
                }

                await pl.setItem(item);

            });

            it('[success] -> balance', async ()=> {

                await mockToken.mint(mockPool.address, toE6(10));

                expect(0).to.equal(fromE6(await mockToken.balanceOf(mockBribe.address)));
                expect(10).to.equal(fromE6(await mockToken.balanceOf(mockPool.address)));
                await pl.payoutDone(mockToken.address);
                expect(10).to.equal(fromE6(await mockToken.balanceOf(mockBribe.address)));
                expect(0).to.equal(fromE6(await mockToken.balanceOf(mockPool.address)));
            })

            it('[success] -> event', async ()=> {

                await mockToken.mint(mockPool.address, toE6(10));

                let tx = await (await pl.payoutDone(mockToken.address)).wait();
                let event = tx.events.find((e) => e.event == 'PoolOperation');

                expect(item.dexName).to.equal(event.args[0]);
                expect('Bribe').to.equal(event.args[1]);
                expect(item.poolName).to.equal(event.args[2]);
                expect(item.pool).to.equal(event.args[3]);
                expect(item.token).to.equal(event.args[4]);
                expect(10).to.equal(fromE6(event.args[5].toString()));
                expect(mockBribe.address).to.equal(event.args[6]);

            });

        });


    });

});

