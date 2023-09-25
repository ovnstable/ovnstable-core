// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@overnight-contracts/connectors/contracts/stuff/Inch.sol";

import "./interfaces/IControlRole.sol";
import "./interfaces/IInchSwapper.sol";


contract InchSwapper is IInchSwapper, Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    IInchRouter public inchRouter;
    
    mapping(address => mapping(address => bytes)) private routePathsMap;

    /// @notice Info of each path;
    // RoutePath[] public routePaths;

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


    function swap(address recipient, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountMinOut) public {        

        IInchRouter.SwapDescriptionV5 memory desc = IInchRouter.SwapDescriptionV5({
            srcToken: tokenIn,
            dstToken: tokenOut,
            srcReceiver: payable(msg.sender),
            dstReceiver: payable(recipient),
            amount: amountIn,
            minReturnAmount: amountMinOut,
            flags: 0
        });

        inchRouter.swap(
            msg.sender,
            desc,
            "0x",
            routePathsMap[tokenIn][tokenOut]
        );

    }
    
    function getPath(address tokenIn, address tokenOut) public view returns(bytes memory) {
        return routePathsMap[tokenIn][tokenOut];

    }

    function updatePath(address tokenIn, address tokenOut, bytes calldata path) public onlyAdmin {
        require(tokenIn != tokenOut && tokenIn != address(0) && tokenOut != address(0), "not unique tokens");
        routePathsMap[tokenIn][tokenOut] = path;
    }

    


    uint256[50] private __gap;
}
