// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/core/contracts/interfaces/IHedgeExchanger.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";


contract StrategyEtsDaiUsdt is Strategy {

    // --- params

    IERC20 public dai;
    IERC20 public usdt;

    IERC20 public rebaseToken;
    IHedgeExchanger public hedgeExchanger;

    IPriceFeed public oracleDai;
    IPriceFeed public oracleUsdt;

    uint256 public daiDm;
    uint256 public usdtDm;

    address public curve3Pool;


    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address dai;
        address usdt;
        address rebaseToken;
        address hedgeExchanger;
        address oracleDai;
        address oracleUsdt;
        address curve3Pool;
    }


    // --- constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        dai = IERC20(params.dai);
        usdt = IERC20(params.usdt);

        rebaseToken = IERC20(params.rebaseToken);
        hedgeExchanger = IHedgeExchanger(params.hedgeExchanger);

        oracleDai = IPriceFeed(params.oracleDai);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        daiDm = 10 ** IERC20Metadata(params.dai).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();

        curve3Pool = params.curve3Pool;

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(dai), "Some token not compatible");

        // swap dai to usdt
        uint256 usdtMinAmount = OvnMath.subBasisPoints(_oracleDaiToUsdt(_amount), swapSlippageBP) - 1e13;
        CurveLibrary.swap(
            curve3Pool,
            address(dai),
            address(usdt),
            _amount,
            usdtMinAmount
        );

        // buy
        uint256 usdtBalance = usdt.balanceOf(address(this));
        usdt.approve(address(hedgeExchanger), usdtBalance);
        hedgeExchanger.buy(usdtBalance, "");
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(dai), "Some token not compatible");

        // add for unstake more than requested
        uint256 rebaseTokenAmount = OvnMath.addBasisPoints(_oracleDaiToUsdt(_amount), swapSlippageBP) + 1e13;
        uint256 rebaseTokenBalance = rebaseToken.balanceOf(address(this));
        if (rebaseTokenAmount > rebaseTokenBalance) {
            rebaseTokenAmount = rebaseTokenBalance;
        }

        // redeem
        rebaseToken.approve(address(hedgeExchanger), rebaseTokenAmount);
        hedgeExchanger.redeem(rebaseTokenAmount);

        // swap usdt to dai
        uint256 usdtBalance = usdt.balanceOf(address(this));
        uint256 daiMinAmount = OvnMath.subBasisPoints(_oracleUsdtToDai(usdtBalance), swapSlippageBP);
        CurveLibrary.swap(
            curve3Pool,
            address(usdt),
            address(dai),
            usdtBalance,
            daiMinAmount
        );

        return dai.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(dai), "Some token not compatible");

        // redeem
        uint256 rebaseTokenBalance = rebaseToken.balanceOf(address(this));
        rebaseToken.approve(address(hedgeExchanger), rebaseTokenBalance);
        hedgeExchanger.redeem(rebaseTokenBalance);

        // swap usdt to dai
        uint256 usdtBalance = usdt.balanceOf(address(this));
        uint256 daiMinAmount = OvnMath.subBasisPoints(_oracleUsdtToDai(usdtBalance), swapSlippageBP);
        CurveLibrary.swap(
            curve3Pool,
            address(usdt),
            address(dai),
            usdtBalance,
            daiMinAmount
        );

        return dai.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 usdtBalance = usdt.balanceOf(address(this)) + rebaseToken.balanceOf(address(this));

        if (usdtBalance > 0) {
            if (nav) {
                daiBalance += _oracleUsdtToDai(usdtBalance);
            } else {
                daiBalance += OvnMath.subBasisPoints(_oracleUsdtToDai(usdtBalance), swapSlippageBP);
            }
        }

        return daiBalance;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

    function _oracleUsdtToDai(uint256 usdtAmount) internal view returns (uint256) {
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(usdtAmount, usdtDm, daiDm, priceUsdt, priceDai);
    }

    function _oracleDaiToUsdt(uint256 daiAmount) internal view returns (uint256) {
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(daiAmount, daiDm, usdtDm, priceDai, priceUsdt);
    }

}
