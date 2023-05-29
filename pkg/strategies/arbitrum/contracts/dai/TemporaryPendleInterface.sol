// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;


struct SwapData {
    SwapType swapType;
    address extRouter;
    bytes extCalldata;
    bool needScale;
}

enum SwapType {
    NONE,
    KYBERSWAP,
    ONE_INCH,
    // ETH_WETH not used in Aggregator
    ETH_WETH
}

struct TokenInput {
    // Token/Sy data
    address tokenIn;
    uint256 netTokenIn;
    address tokenMintSy;
    address bulk;
    // aggregator data
    address pendleSwap;
    SwapData swapData;
}

struct TokenOutput {
    // Token/Sy data
    address tokenOut;
    uint256 minTokenOut;
    address tokenRedeemSy;
    address bulk;
    // aggregator data
    address pendleSwap;
    SwapData swapData;
}

struct MarketStorage {
    int128 totalPt;
    int128 totalSy;
    // 1 SLOT = 256 bits
    uint96 lastLnImpliedRate;
    uint16 observationIndex;
    uint16 observationCardinality;
    uint16 observationCardinalityNext;
    // 1 SLOT = 144 bits
}

struct ApproxParams {
    uint256 guessMin;
    uint256 guessMax;
    uint256 guessOffchain;
    uint256 maxIteration;
    uint256 eps;
}

interface IPendleRouter {
    
    function mintPyFromToken(
        address receiver,
        address YT,
        uint256 minPyOut,
        TokenInput calldata input
    ) external payable returns (uint256 netPyOut);

    function addLiquidityDualSyAndPt(
        address receiver,
        address market,
        uint256 netSyDesired,
        uint256 netPtDesired,
        uint256 minLpOut
    ) external returns (uint256 netLpOut, uint256 netSyUsed, uint256 netPtUsed);

    function redeemPyToToken(
        address receiver,
        address YT,
        uint256 netPyIn,
        TokenOutput calldata output
    ) external returns (uint256 netTokenOut);


    function removeLiquidityDualSyAndPt(
        address receiver,
        address market,
        uint256 netLpToRemove,
        uint256 minSyOut,
        uint256 minPtOut
    ) external returns (uint256 netSyOut, uint256 netPtOut);

    function redeemDueInterestAndRewards(
        address user,
        address[] calldata sys,
        address[] calldata yts,
        address[] calldata markets
    ) external;

    function swapExactPtForSy(
        address receiver,
        address market,
        uint256 exactPtIn,
        uint256 minSyOut
    ) external returns (uint256 netSyOut, uint256 netSyFee);

    function swapExactYtForSy(
        address receiver,
        address market,
        uint256 exactYtIn,
        uint256 minSyOut
    ) external returns (uint256 netSyOut, uint256 netSyFee);

}

interface IPendleStargateLPSY {

    function deposit(
        address receiver,
        address tokenIn,
        uint256 amountTokenToDeposit,
        uint256 minSharesOut
    ) external payable returns (uint256 amountSharesOut);

    function redeem(
        address receiver,
        uint256 amountSharesToRedeem,
        address tokenOut,
        uint256 minTokenOut,
        bool burnFromInternalBalance
    ) external returns (uint256 amountTokenOut);

    function balanceOf(address account) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);
    
}

interface IPendleMarket {

    function _storage() external view returns (MarketStorage memory marketStorage);

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);
    
}

interface IStargatePool {

    function totalSupply() external view returns (uint256);

    function totalLiquidity() external view returns (uint256);
    
}

interface IPendlePtOracle {

    function getPtToAssetRate(
        address market,
        uint32 duration
    ) external view returns (uint256 ptToAssetRate);

    function getOracleState(
        address market,
        uint32 duration
    ) 
    external
    view
    returns (
        bool increaseCardinalityRequired,
        uint16 cardinalityRequired,
        bool oldestObservationSatisfied
    );
    
}


interface IGToken {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function makeWithdrawRequest(uint shares, address owner) external;
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function maxRedeem(address owner) external view returns (uint);
    function maxWithdraw(address owner) external view returns (uint);
    function previewDeposit(uint256 assets) external view returns (uint256 shares);

    function convertToShares(uint256 assets) external view returns (uint256 shares);

    function convertToAssets(uint256 shares) external view returns (uint256 assets);

    function previewWithdraw(uint256 assets) external view returns (uint256 shares);

    function previewRedeem(uint256 shares) external view returns (uint256 assets);

    function totalSharesBeingWithdrawn(address owner) external view returns (uint shares);

    function currentEpochStart() external view returns (uint);
}

interface IOpenTradesPnlFeed{
    function nextEpochValuesRequestCount() external view returns(uint);
    function newOpenPnlRequestOrEpoch() external;
}