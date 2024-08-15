// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/connectors/contracts/stuff/Rubicon.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";


contract StrategyRubiconUsdt is Strategy {

    IERC20 public usdcToken;
    IERC20 public usdtToken;
    IERC20 public opToken;
    BathToken public rubiconUsdt;

    ISwapRouter public uniswapV3Router;
    uint24 public poolUsdcOpFee;
    uint24 public poolUsdcUsdtFee;

    IPriceFeed public oracleUsdt;
    IPriceFeed public oracleUsdc;

    uint256 usdtDm;
    uint256 usdcDm;

    address public curve3Pool;


    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdcToken;
        address usdtToken;
        address opToken;
        address rubiconUsdt;
        address uniswapV3Router;
        uint24 poolUsdcOpFee;
        uint24 poolUsdcUsdtFee;
        address oracleUsdt;
        address oracleUsdc;
        address curve3Pool;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdcToken = IERC20(params.usdcToken);
        usdtToken = IERC20(params.usdtToken);
        opToken = IERC20(params.opToken);
        rubiconUsdt = BathToken(params.rubiconUsdt);
        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolUsdcOpFee = params.poolUsdcOpFee;
        poolUsdcUsdtFee = params.poolUsdcUsdtFee;
        oracleUsdt = IPriceFeed(params.oracleUsdt);
        oracleUsdc = IPriceFeed(params.oracleUsdc);
        usdcDm = 10 ** IERC20Metadata(params.usdcToken).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdtToken).decimals();
        curve3Pool = params.curve3Pool;

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        CurveLibrary.swap(
            curve3Pool,
            address(usdcToken),
            address(usdtToken),
            usdcBalance,
            OvnMath.subBasisPoints(_oracleUsdcToUsdt(usdcBalance), swapSlippageBP)
        );

        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        usdtToken.approve(address(rubiconUsdt), usdtBalance);
        rubiconUsdt.deposit(usdtBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        // Uniswap V3 swap fee (100 = 0.01%) => 1
        uint256 swapFee = poolUsdcUsdtFee / 100;
        // rubicon withdraw fee - 0.03% in 3 bp
        uint256 withdrawFee = 3;
        uint256 basicPoints = swapFee + withdrawFee;

        uint256 _shares = rubiconUsdt.previewWithdraw(OvnMath.addBasisPoints(_oracleUsdcToUsdt(_amount + 10), basicPoints));
        rubiconUsdt.withdraw(_shares);

        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        CurveLibrary.swap(
            curve3Pool,
            address(usdtToken),
            address(usdcToken),
            usdtBalance,
            OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP)
        );

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 shares = rubiconUsdt.balanceOf(address(this));
        if(shares == 0){
            return 0;
        }

        rubiconUsdt.withdraw(shares);

        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        CurveLibrary.swap(
            curve3Pool,
            address(usdtToken),
            address(usdcToken),
            usdtBalance,
            OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP)
        );

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        uint256 usdtBalance = usdtToken.balanceOf(address(this));

        uint256 shares = rubiconUsdt.balanceOf(address(this));
        uint256 usdtAmount = rubiconUsdt.convertToAssets(shares);
        usdcBalance += _oracleUsdtToUsdc(usdtAmount + usdtBalance);

        return usdcBalance;
    }

    function liquidationValue() external view override returns (uint256) {
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        uint256 usdtBalance = usdtToken.balanceOf(address(this));

        uint256 shares = rubiconUsdt.balanceOf(address(this));
        uint256 usdtAmount = rubiconUsdt.previewRedeem(shares);
        usdcBalance += OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtAmount + usdtBalance), swapSlippageBP);

        return usdcBalance;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {

        uint256 shares = rubiconUsdt.balanceOf(address(this));
        if(shares == 0){
            return 0;
        }

        // claim rewards - rewards get when withdraw
        rubiconUsdt.withdraw(0);

        uint256 totalUsdc;

        uint256 opBalance = opToken.balanceOf(address(this));
        if (opBalance > 0) {

            uint256 opUsdc = UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(opToken),
                address(usdcToken),
                poolUsdcOpFee,
                address(this),
                opBalance,
                0
            );
            totalUsdc += opUsdc;
        }

        if (totalUsdc > 0) {
            usdcToken.transfer(_beneficiary, totalUsdc);
        }

        return totalUsdc;
    }

    function _oracleUsdtToUsdc(uint256 _usdtAmount) internal view returns (uint256){
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(_usdtAmount, usdtDm, usdcDm, priceUsdt, priceUsdc);
    }

    function _oracleUsdcToUsdt(uint256 _usdcAmount) internal view returns (uint256){
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(_usdcAmount, usdcDm, usdtDm, priceUsdc, priceUsdt);
    }
}
