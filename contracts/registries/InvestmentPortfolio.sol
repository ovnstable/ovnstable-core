// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract InvestmentPortfolio is AccessControl {
    uint256 public constant TOTAL_WEIGHT = 100000; // 100000 ~ 100%

    mapping(address => uint256) private assetInfoPositions;
    AssetInfo[] assetInfos;
    mapping(address => uint256) private assetWeightPositions;
    AssetWeight[] public assetWeights;

    //TODO: remove
    event ConsoleLog(string str);

    struct AssetWeight {
        address asset;
        uint256 minWeight;
        uint256 targetWeight;
        uint256 maxWeight;
    }

    struct AssetInfo {
        address asset;
        address priceGetter;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setAssetInfos(AssetInfo[] calldata _assetInfos) external onlyAdmin {
        for (uint8 i = 0; i < _assetInfos.length; i++) {
            _addAssetInfoAt(_assetInfos[i], i);
        }
        // truncate array if needed
        if (assetInfos.length > _assetInfos.length) {
            uint256 removeCount = assetInfos.length - _assetInfos.length;
            for (uint8 i = 0; i < removeCount; i++) {
                //TODO: do we need remove from mapping?
                assetInfos.pop();
            }
        }
    }

    function addAssetInfoAt(AssetInfo calldata assetInfo, uint256 index) external onlyAdmin {
        _addAssetInfoAt(assetInfo, index);
    }

    function _addAssetInfoAt(AssetInfo calldata assetInfo, uint256 index) internal {
        uint256 currentlength = assetInfos.length;
        // expand array id needed
        if (currentlength == 0 || currentlength - 1 < index) {
            uint256 additionalCount = index - currentlength + 1;
            for (uint8 i = 0; i < additionalCount; i++) {
                assetInfos.push();
            }
        }
        assetInfos[index] = assetInfo;
        assetInfoPositions[assetInfo.asset] = index;
    }

    function setWeights(AssetWeight[] calldata _assetWeights) external onlyAdmin {
        //TODO: remove
        emit ConsoleLog(
            string(abi.encodePacked("_assetWeights.length: ", uint2str(_assetWeights.length)))
        );

        uint256 totalTarget = 0;
        for (uint8 i = 0; i < _assetWeights.length; i++) {
            AssetWeight memory assetWeight = _assetWeights[i];
            require(assetWeight.asset != address(0), "weight without asset");
            require(
                assetWeight.minWeight <= assetWeight.targetWeight,
                "minWeight shouldn't higher than targetWeight"
            );
            require(
                assetWeight.targetWeight <= assetWeight.maxWeight,
                "targetWeight shouldn't higher than maxWeight"
            );
            totalTarget += assetWeight.targetWeight;
        }
        require(totalTarget == TOTAL_WEIGHT, "Total target should equal to TOTAL_WEIGHT");
        //TODO: remove
        emit ConsoleLog(string(abi.encodePacked("totalTarget: ", uint2str(totalTarget))));

        for (uint8 i = 0; i < _assetWeights.length; i++) {
            _addWeightAt(_assetWeights[i], i);
            assetWeightPositions[assetWeights[i].asset] = i;
        }

        // truncate if need
        if (assetWeights.length > _assetWeights.length) {
            uint256 removeCount = assetWeights.length - _assetWeights.length;
            for (uint8 i = 0; i < removeCount; i++) {
                assetWeights.pop();
            }
        }
    }

    function _addWeightAt(AssetWeight memory assetWeight, uint256 index) internal {
        uint256 currentlength = assetWeights.length;
        // expand if need
        if (currentlength == 0 || currentlength - 1 < index) {
            uint256 additionalCount = index - currentlength + 1;
            for (uint8 i = 0; i < additionalCount; i++) {
                assetWeights.push();
            }
        }
        assetWeights[index] = assetWeight;
    }

    function getAllAssets() external view returns (AssetInfo[] memory) {
        return assetInfos;
    }

    function getAssetInfo(address asset) external view returns (AssetInfo memory) {
        return assetInfos[assetInfoPositions[asset]];
    }

    function getAssetWeight(address asset) external view returns (AssetWeight memory) {
        return assetWeights[assetWeightPositions[asset]];
    }

    //TODO: add `view` after removing event emitting
    function getAllAssetWeights() external returns (AssetWeight[] memory) {
        //TODO: remove
        emit ConsoleLog(
            string(abi.encodePacked("assetWeights.length: ", uint2str(assetWeights.length)))
        );

        return assetWeights;
    }

    //TODO: remove
    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k - 1;
            bstr[k] = bytes1(uint8(48 + (_i % 10)));
            _i /= 10;
        }
        return string(bstr);
    }
}
