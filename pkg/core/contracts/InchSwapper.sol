// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@overnight-contracts/connectors/contracts/stuff/Inch.sol";

import "./interfaces/IControlRole.sol";
import "./interfaces/IInchSwapper.sol";

import "hardhat/console.sol";


contract InchSwapper is IInchSwapper, Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    
    bytes32 public constant UNIT_ROLE = keccak256("UNIT_ROLE");

    IInchRouter public inchRouter;
    
    mapping(address => mapping(address => Route)) public routePathsMap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setRouter(address _inchRouter) public onlyAdmin {
        inchRouter = IInchRouter(_inchRouter);
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

    
    modifier onlyUnit(){
        require(hasRole(UNIT_ROLE, msg.sender), "Restricted to Unit");
        _;
    }


    function swap(address recipient, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountMinOut) public {  
        require(routePathsMap[tokenIn][tokenOut].amount >= amountIn, "amount is more than saved");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(routePathsMap[tokenIn][tokenOut].srcReceiver, amountIn);   
        IERC20(tokenIn).approve(address(inchRouter), amountIn);

        IInchRouter.SwapDescriptionV5 memory desc = IInchRouter.SwapDescriptionV5({
            srcToken: tokenIn,
            dstToken: tokenOut,
            srcReceiver: payable(routePathsMap[tokenIn][tokenOut].srcReceiver),
            dstReceiver: payable(recipient),
            amount: amountIn,
            minReturnAmount: amountMinOut,
            flags: routePathsMap[tokenIn][tokenOut].flags
        });

        inchRouter.swap(
            routePathsMap[tokenIn][tokenOut].srcReceiver,
            desc,
            "0x",
            routePathsMap[tokenIn][tokenOut].data
        );
    }

    function updatePath(UpdateParams memory params, bytes memory path) public onlyUnit {
        require(params.tokenIn != params.tokenOut && params.tokenIn != address(0) && params.tokenOut != address(0), "not unique tokens");
        routePathsMap[params.tokenIn][params.tokenOut] = Route({
            updateBlock: block.number,
            amount: params.amount,
            flags: params.flags,
            srcReceiver: params.srcReceiver,
            data: path
        });
    }

}
