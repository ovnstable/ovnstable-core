// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import "./interfaces/IRebaseToken.sol";

abstract contract Insurance is Initializable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    using WadRayMath for uint256;

    bytes32 public constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");

    IRebaseToken public senior;
    IRebaseToken public junior;
    IERC20 public asset;

    uint256 public minJuniorWeight;
    uint256 public maxJuniorWeight;

    // last block number when buy/redeem was executed
    uint256 public lastBlockNumber;


    enum TrancheType {SENIOR, JUNIOR}

    struct InputMint {
        uint256 amount;
        TrancheType tranche;
    }

    struct InputRedeem {
        uint256 amount;
        TrancheType tranche;
    }

    struct InsuranceParams {
        address senior;
        address junior;
        address asset;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function __Insurance_init() internal initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // 10%
        minJuniorWeight = 10;

        // 30%
        maxJuniorWeight = 30;
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyPortfolioAgent() {
        require(hasRole(PORTFOLIO_AGENT_ROLE, msg.sender), "Restricted to Portfolio Agent");
        _;
    }

    modifier oncePerBlock() {
        require(lastBlockNumber < block.number, "Only once in block");
        lastBlockNumber = block.number;
        _;
    }

    function setParams(InsuranceParams calldata params) external onlyAdmin {
        senior = IRebaseToken(params.senior);
        junior = IRebaseToken(params.junior);
        asset = IERC20(params.asset);
    }

    function setWeights(uint256 _minJuniorWeight, uint256 _maxJuniorWeight) external onlyPortfolioAgent {
        minJuniorWeight = _minJuniorWeight;
        maxJuniorWeight = _maxJuniorWeight;
    }


    function totalSupply() public view returns (uint256){
        return senior.totalSupply() + junior.totalSupply();
    }

    function mint(InputMint calldata input) external whenNotPaused oncePerBlock {
        _mint(input.amount, input.tranche == TrancheType.JUNIOR);
    }

    function _mint(uint256 _amount, bool isJunior) internal {
        require(_amount > 0, "Amount of asset is zero");
        require(asset.balanceOf(msg.sender) >= _amount, "Not enough tokens to mint");

        if(isJunior){
            require(_amount <= maxMintJunior(), 'Max mint junior');
        }

        IRebaseToken token = isJunior ? junior : senior;

        asset.transferFrom(msg.sender, address(this), _amount);
        uint256 minNavExpected = OvnMath.subBasisPoints(netAssetValue(), 4); //0.04%
        _deposit(_amount);
        require(netAssetValue() >= minNavExpected, "NAV less than expected");

        uint256 trancheAmount = _assetToTrancheAmount(_amount, token);
        require(trancheAmount > 0, "Amount of Senior is zero");
        token.mint(msg.sender, trancheAmount);

    }

    // Convert Asset amount (e6 | e18) to (Senior|Junior) amount (e6)
    function _assetToTrancheAmount(uint256 _amount, IRebaseToken token) internal returns (uint256) {
        uint256 trancheDecimals = token.decimals();
        uint256 assetDecimals = IERC20Metadata(address(asset)).decimals();

        uint256 trancheAmount;
        if (assetDecimals > trancheDecimals) {
            trancheAmount = _amount / (10 ** (assetDecimals - trancheDecimals));
        } else {
            trancheAmount = _amount * (10 ** (trancheDecimals - assetDecimals));
        }
        return trancheAmount;

    }

    function redeem(InputRedeem calldata input) external whenNotPaused oncePerBlock {
        _redeem(input.amount, input.tranche == TrancheType.JUNIOR);
    }

    function _redeem(uint256 _amount, bool isJunior) internal {
        require(_amount > 0, "Amount of asset is zero");

        if(isJunior){
            require(_amount <= maxRedeemJunior(), 'Max redeem junior');
        }

        IRebaseToken token = isJunior ? junior : senior;

        require(token.balanceOf(msg.sender) >= _amount, "Not enough tokens to redeem");
        token.burn(msg.sender, _amount);

        uint256 assetAmount = _trancheAmountToAsset(_amount, token);
        require(assetAmount > 0, "Amount of asset is zero");

        uint256 minNavExpected = OvnMath.subBasisPoints(netAssetValue() - assetAmount, 4); //0.04%
        _withdraw(assetAmount);
        require(asset.balanceOf(address(this)) >= assetAmount, "Not enough for transfer" );
        asset.transfer(msg.sender, assetAmount);
        require(netAssetValue() >= minNavExpected, "NAV less than expected");
    }

    // Convert (Senior|Junior) amount (e6) to Asset amount (e6 | e18)
    function _trancheAmountToAsset(uint256 _amount, IRebaseToken token) internal returns (uint256) {

        uint256 trancheAmount;
        uint256 assetDecimals = IERC20Metadata(address(asset)).decimals();
        uint256 trancheDecimals = token.decimals();
        if (assetDecimals > trancheDecimals) {
            trancheAmount = _amount * (10 ** (assetDecimals - trancheDecimals));
        } else {
            trancheAmount = _amount / (10 ** (trancheDecimals - assetDecimals));
        }
        return trancheAmount;

    }
    function maxMintJunior() public view returns (uint256){

        if(senior.totalSupply() == 0){
            return 0;
        }

        uint256 temp = (totalSupply() * maxJuniorWeight / 100);
        uint256 juniorSupply = junior.totalSupply();

        if(temp > juniorSupply){
            return temp - juniorSupply;
        }else {
            return 0;
        }
    }

    function maxRedeemJunior() public view returns (uint256){

        if(senior.totalSupply() == 0){
            return junior.totalSupply();
        }

        uint256 temp = (totalSupply() * minJuniorWeight / 100);
        uint256 juniorSupply = junior.totalSupply();

        if(juniorSupply > temp){
            return juniorSupply - temp;
        }else {
            return 0;
        }
    }


    function getWeight() public view returns (uint256) {

        uint256 juniorTotalSupply = junior.totalSupply();

        if(juniorTotalSupply > 0){
            return juniorTotalSupply / totalSupply();
        }else {
            return 0;
        }
    }

    function _deposit(
        uint256 _amount
    ) internal virtual {
        revert("Not implemented");
    }

    function _withdraw(
        uint256 _amount
    ) internal virtual {
        revert("Not implemented");
    }

    function netAssetValue() public view virtual returns (uint256){
        revert("Not implemented");
    }

    function getAvgApy() public view virtual returns (uint256) {
        revert("Not implemented");
    }


    function payout() public whenNotPaused oncePerBlock onlyAdmin {
        _payout();
    }

    function _payout() internal {

        if(senior.totalSupply() == 0 || junior.totalSupply() == 0){
            return;
        }

        uint256 avgApy = getAvgApy();
        require(avgApy != 0, 'avgApy is zero');
        uint256 dailyApy =  avgApy / 365;
        require(dailyApy != 0, 'dailyApy is zero');

        uint256 seniorTotalNew = senior.totalSupply() + (senior.totalSupply() / 100 * dailyApy) / 1e6;

        uint256 seniorIndexNew = seniorTotalNew.wadToRay() * 1e27 / senior.scaledTotalSupply();
        senior.setLiquidityIndex(seniorIndexNew);
        require(seniorTotalNew == senior.totalSupply(), 'senior.total not equal');

        uint256 juniorTotalNew = netAssetValue() - seniorTotalNew;

        uint256 juniorIndexNew = juniorTotalNew.wadToRay() * 1e27 / junior.scaledTotalSupply();
        junior.setLiquidityIndex(juniorIndexNew);
        require(juniorTotalNew == junior.totalSupply(), 'junior.total not equal');

        require(netAssetValue() == totalSupply(), 'nav not equal total');
    }

    uint256[50] private __gap;
}
