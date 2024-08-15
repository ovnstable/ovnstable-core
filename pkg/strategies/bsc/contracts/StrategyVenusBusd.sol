// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Venus.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV2.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";

contract StrategyVenusBusd is Strategy {

    // --- structs

    struct StrategyParams {
        address busdToken;
        address vBusdToken;
        address unitroller;
        address pancakeRouter;
        address xvsToken;
        address wbnbToken;
        address wombatRouter;
        address wombatPool;
        address usdcToken;
        address oracleUsdc;
        address oracleBusd;
    }


    // --- params

    IERC20 public busdToken;
    VenusInterface public vBusdToken;
    Unitroller public unitroller;
    IPancakeRouter02 public pancakeRouter;
    IERC20 public xvsToken;
    IERC20 public wbnbToken;
    IWombatRouter public wombatRouter;
    address public wombatPool;
    IERC20 public usdcToken;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleBusd;

    uint256 public usdcDm;
    uint256 public busdDm;

    // --- events

    event StrategyUpdatedParams();


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        busdToken = IERC20(params.busdToken);
        vBusdToken = VenusInterface(params.vBusdToken);
        unitroller = Unitroller(params.unitroller);
        pancakeRouter = IPancakeRouter02(params.pancakeRouter);
        xvsToken = IERC20(params.xvsToken);
        wbnbToken = IERC20(params.wbnbToken);
        wombatRouter = IWombatRouter(params.wombatRouter);
        wombatPool = params.wombatPool;
        usdcToken = IERC20(params.usdcToken);

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleBusd = IPriceFeed(params.oracleBusd);

        busdDm = 10 ** IERC20Metadata(params.busdToken).decimals();
        usdcDm = 10 ** IERC20Metadata(params.usdcToken).decimals();

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 usdcBalance = usdcToken.balanceOf(address(this));

        uint256 busdBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(usdcToken),
            address(busdToken),
            wombatPool,
            usdcBalance
        );
        if (busdBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(usdcToken),
                address(busdToken),
                wombatPool,
                usdcBalance,
                OvnMath.subBasisPoints(_oracleUsdcToBusd(usdcBalance), swapSlippageBP),
                address(this)
            );
        }

        uint256 busdBalance = busdToken.balanceOf(address(this));
        busdToken.approve(address(vBusdToken), busdBalance);
        vBusdToken.mint(busdBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 usdcAmountForBusdAmount = WombatLibrary.getAmountOut(
            wombatRouter,
            address(busdToken),
            address(usdcToken),
            wombatPool,
            _amount
        );

        usdcAmountForBusdAmount = OvnMath.addBasisPoints(usdcAmountForBusdAmount, stakeSlippageBP);
        vBusdToken.redeemUnderlying(usdcAmountForBusdAmount);

        // swap busdToken to usdcToken
        uint256 busdBalance = busdToken.balanceOf(address(this));
        uint256 usdcBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(busdToken),
            address(usdcToken),
            wombatPool,
            busdBalance
        );
        if (usdcBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(busdToken),
                address(usdcToken),
                wombatPool,
                busdBalance,
                OvnMath.subBasisPoints(_oracleBusdToUsdc(busdBalance), swapSlippageBP),
                address(this)
            );
        }


        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        vBusdToken.redeem(vBusdToken.balanceOf(address(this)));

        // swap busdToken to usdcToken
        uint256 busdBalance = busdToken.balanceOf(address(this));
        uint256 usdcBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(busdToken),
            address(usdcToken),
            wombatPool,
            busdBalance
        );
        if (usdcBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(busdToken),
                address(usdcToken),
                wombatPool,
                busdBalance,
                OvnMath.subBasisPoints(_oracleBusdToUsdc(busdBalance), swapSlippageBP),
                address(this)
            );
        }

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        uint256 busdBalance = (vBusdToken.balanceOf(address(this)) * vBusdToken.exchangeRateStored() / 1e18) + busdToken.balanceOf(address(this));

        if (busdBalance > 0) {
            if (nav) {
                usdcBalance += _oracleBusdToUsdc(busdBalance);
            } else {
                usdcBalance += WombatLibrary.getAmountOut(
                    wombatRouter,
                    address(busdToken),
                    address(usdcToken),
                    wombatPool,
                    busdBalance
                );
            }
        }

        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        return 0;
    }

    function _oracleBusdToUsdc(uint256 busdAmount) internal view returns (uint256) {
        uint256 priceBusd = uint256(oracleBusd.latestAnswer());
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(busdAmount, busdDm, usdcDm, priceBusd, priceUsdc);
    }

    function _oracleUsdcToBusd(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceBusd = uint256(oracleBusd.latestAnswer());
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, busdDm, priceUsdc, priceBusd);
    }


}
