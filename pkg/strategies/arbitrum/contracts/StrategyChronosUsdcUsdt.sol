// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chronos.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Gmx.sol";

contract StrategyChronosUsdcUsdt is Strategy {

    uint256 constant public WEEK = 7 * 86400;

    IERC20 public usdc;
    IERC20 public usdt;
    IERC20 public chr;

    uint256 public usdcDm;
    uint256 public usdtDm;

    IChronosRouter public router;
    IChronosGauge public gauge;
    IChronosPair public pair;
    IChronosNFT public nft;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;

    IRouter public gmxRouter;
    IVault public gmxVault;
    GmxReader public gmxReader;

    ISwapRouter public uniswapV3Router;


    // Store IDs NFT for each epoch
    // How is it working?
    // LIFO - last in, first out
    uint256[] public tokensEpoch;

    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address usdt;
        address chr;
        address router;
        address gauge;
        address pair;
        address nft;
        address oracleUsdc;
        address oracleUsdt;
        address uniswapV3Router;
        address gmxRouter;
        address gmxVault;
        address gmxReader;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdc = IERC20(params.usdc);
        usdt = IERC20(params.usdt);
        chr = IERC20(params.chr);

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();

        router = IChronosRouter(params.router);
        gauge = IChronosGauge(params.gauge);
        pair = IChronosPair(params.pair);
        nft = IChronosNFT(params.nft);

        gmxRouter = IRouter(params.gmxRouter);
        gmxVault = IVault(params.gmxVault);
        gmxReader = GmxReader(params.gmxReader);

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        (uint256 reserveUsdt, uint256 reserveUsdc,) = pair.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveUsdt > 10 ** 3, 'Liquidity lpToken reserves too low');

        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 usdtBalance = usdt.balanceOf(address(this));

        uint256 amountUsdcIn = GmxLibrary.getAmountToSwap(
            gmxVault,
            gmxReader,
            address(usdc),
            address(usdt),
            usdcBalance,
            reserveUsdc,
            reserveUsdt,
            usdcDm,
            usdtDm,
            1
        );

        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUsdcToUsdt(amountUsdcIn), swapSlippageBP);

        _swap(address(usdc), address(usdt), amountUsdcIn, amountOutMin);

        usdcBalance = usdc.balanceOf(address(this));
        usdtBalance = usdt.balanceOf(address(this));

        usdc.approve(address(router), usdcBalance);
        usdt.approve(address(router), usdtBalance);

        router.addLiquidity(
            address(usdc),
            address(usdt),
            true,
            usdcBalance,
            usdtBalance,
            OvnMath.subBasisPoints(usdcBalance, stakeSlippageBP),
            OvnMath.subBasisPoints(usdtBalance, stakeSlippageBP),
            address(this),
            block.timestamp
        );

        uint256 pairBalance = pair.balanceOf(address(this));
        _stakeToGauge(pairBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 totalLpBalance = pair.totalSupply();
        (uint256 reserveUsdt, uint256 reserveUsdc,) = pair.getReserves();

        uint256 amountLp = GmxLibrary.getAmountLpTokens(
            gmxVault,
            gmxReader,
            address(usdc),
            address(usdt),
            OvnMath.addBasisPoints(_amount + 10, swapSlippageBP),
            totalLpBalance,
            reserveUsdc,
            reserveUsdt,
            usdcDm,
            usdtDm,
            1
        );

        uint256 pairBalance = gauge.balanceOf(address(this));

        if (amountLp > pairBalance) {
            amountLp = pairBalance;
        }

        uint256 amountUsdc = reserveUsdc * amountLp / totalLpBalance;
        uint256 amountUsdt = reserveUsdt * amountLp / totalLpBalance;

        _unstakeFromGauge(amountLp);

        pair.approve(address(router), amountLp);
        router.removeLiquidity(
            address(usdc),
            address(usdt),
            true,
            amountLp,
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            OvnMath.subBasisPoints(amountUsdt, stakeSlippageBP),
            address(this),
            block.timestamp
        );

        uint256 usdtBalance = usdt.balanceOf(address(this));
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP);
        _swap(address(usdt), address(usdc), usdtBalance, amountOutMin);

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 pairBalance = gauge.balanceOf(address(this));

        if (pairBalance == 0) {
            return usdc.balanceOf(address(this));
        }

        _unstakeFromGauge(pairBalance);

        uint256 totalLpBalance = pair.totalSupply();
        (uint256 reserveUsdt, uint256 reserveUsdc,) = pair.getReserves();

        uint256 amountUsdc = reserveUsdc * pairBalance / totalLpBalance;
        uint256 amountUsdt = reserveUsdt * pairBalance / totalLpBalance;

        pair.approve(address(router), pairBalance);
        router.removeLiquidity(
            address(usdc),
            address(usdt),
            true,
            pairBalance,
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            OvnMath.subBasisPoints(amountUsdt, stakeSlippageBP),
            address(this),
            block.timestamp
        );

        uint256 usdtBalance = usdt.balanceOf(address(this));
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP);
        _swap(address(usdt), address(usdc), usdtBalance, amountOutMin);

        return usdc.balanceOf(address(this));
    }


    // How to stake?
    // - if not exist any tokens
    //   then create NFT and add ID to array
    // - if existed token in current epoch
    //   then create NFT and merge with last NFT from current epoch (position in array is last)
    // - if not existed token for current epoch
    //   then create NFT and push to last position

    function _stakeToGauge(uint256 pairBalance) internal {

        pair.approve(address(gauge), pairBalance);

        if(tokensEpoch.length == 0){
            tokensEpoch.push(gauge.deposit(pairBalance));
        }else {
            uint256 currentEpoch = block.timestamp/WEEK;

            uint256 lastToken = tokensEpoch[tokensEpoch.length - 1];
            uint256 lastEpoch = gauge._depositEpoch(lastToken);

            if(lastEpoch == currentEpoch){
                // Current epoch -> merge with last position
                uint256 tokenIdNew = gauge.deposit(pairBalance);
                gauge.harvestAndMerge(tokenIdNew, lastToken);
            }else {
                // New epoch -> push to last position
                uint256 tokenId = gauge.deposit(pairBalance);
                tokensEpoch.push(tokenId);
            }
        }
    }


    function _unstakeFromGauge(uint256 pairBalance) internal {

        if(gauge.balanceOf(address(this)) == pairBalance){
            gauge.withdrawAndHarvestAll();
            delete tokensEpoch;
        }else {
            _unstakeTokensByRecursion(pairBalance);
        }
    }

    // How to unstake?
    // Using recursion for unstaking enought pair amounts
    //
    // Step 0:
    // - targetPairBalance - 100
    // - currentPairBalance - 0
    // - tokensEpoch = [1,2,3]
    // then
    // - Burn token 3
    // - Recursion call

    // Step 1:
    // - targetPairBalance - 100
    // - currentPairBalance - 50
    // - tokensEpoch = [1,2]
    // then
    // - Burn token 2
    // - Recursion call

    // Step 2:
    // - targetPairBalance - 100
    // - currentPairBalance - 150
    // - tokensEpoch = [1]
    // then
    // - stake pair balance to gauge - 50
    // - return 100 pair

    function _unstakeTokensByRecursion(uint256 targetPairBalance) internal {

        uint256 currentPairBalance = pair.balanceOf(address(this));
        if (targetPairBalance > currentPairBalance) {

            uint256 lastToken = tokensEpoch[tokensEpoch.length - 1];
            gauge.withdrawAndHarvest(lastToken);
            tokensEpoch.pop();

            return _unstakeTokensByRecursion(targetPairBalance);
        } else {
            uint256 stakePairBalance = currentPairBalance - targetPairBalance;
            if (stakePairBalance > 0) {
                _stakeToGauge(stakePairBalance);
            }
        }
    }


    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 usdtBalance = usdt.balanceOf(address(this));

        uint256 pairBalance = gauge.balanceOf(address(this));
        if (pairBalance > 0) {
            uint256 totalLpBalance = pair.totalSupply();
            (uint256 reserveUsdt, uint256 reserveUsdc,) = pair.getReserves();
            usdcBalance += reserveUsdc * pairBalance / totalLpBalance;
            usdtBalance += reserveUsdt * pairBalance / totalLpBalance;
        }

        uint256 usdcBalanceFromUsdt;
        if (usdtBalance > 0) {
            if (nav) {
                usdcBalanceFromUsdt = _oracleUsdtToUsdc(usdtBalance);
            } else {
                usdcBalanceFromUsdt = GmxLibrary.getAmountOut(gmxVault, gmxReader, address(usdt), address(usdc), usdtBalance);
            }
        }

        return usdcBalance + usdcBalanceFromUsdt;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        if (gauge.balanceOf(address(this)) == 0) {
            return 0;
        }

        uint256 usdcBefore = usdc.balanceOf(address(this));

        // claim rewards
        gauge.getAllReward();

        // sell rewards
        uint256 chrBalance = chr.balanceOf(address(this));
        if (chrBalance > 0) {
            uint256 amountOut = ChronosLibrary.getAmountsOut(
                router,
                address(chr),
                address(usdc),
                false,
                chrBalance
            );

            if (amountOut > 0) {
                ChronosLibrary.singleSwap(
                    router,
                    address(chr),
                    address(usdc),
                    false,
                    chrBalance,
                    amountOut * 99 / 100,
                    address(this)
                );
            }

        }

        uint256 totalUsdc = usdc.balanceOf(address(this)) - usdcBefore;
        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

    function _oracleUsdtToUsdc(uint256 amount) internal view returns (uint256) {
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(amount, usdtDm, usdcDm, priceUsdt, priceUsdc);
    }

    function _oracleUsdcToUsdt(uint256 amount) internal view returns (uint256) {
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(amount, usdcDm, usdtDm, priceUsdc, priceUsdt);
    }

    function _swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) internal {

        // Gmx Vault has max limit for accepting tokens, for example DAI max capacity: 35kk$
        // If after swap vault of balance more capacity then transaction revert
        // We check capacity and if it not enough then use other swap route (UniswapV3)


        // AmountIn expand to 18 decimal because gmx store all amounts in 18 decimals
        // USDC - 6 decimals => +12 decimals
        // DAI - 18 decimals => +0 decimals
        uint256 capacityAfterSwap = gmxVault.usdgAmounts(address(tokenIn));
        capacityAfterSwap += amountIn * (10 ** (18 - IERC20Metadata(tokenIn).decimals()));
        uint256 maxCapacity = gmxVault.maxUsdgAmounts(address(tokenIn));


        if (maxCapacity > capacityAfterSwap) {
            GmxLibrary.singleSwap(
                gmxRouter,
                address(tokenIn),
                address(tokenOut),
                amountIn,
                amountOutMin);

        } else {
            UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(tokenIn),
                address(tokenOut),
                100,
                address(this),
                amountIn,
                amountOutMin
            );
        }
    }

}
