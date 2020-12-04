pragma solidity 0.5.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/lifecycle/Pausable.sol";
import "@openzeppelin/contracts/access/roles/WhitelistAdminRole.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./Lib/ReentrancyGuard.sol";
import "./InternalContract.sol";

contract SponsorFaucet is
    Ownable,
    Pausable,
    ReentrancyGuard,
    WhitelistAdminRole
{
    using SafeMath for uint256;
    using Address for address;

    struct Detail {
        //current accumulated sponsored amout for gas
        uint256 gas_amount_accumulated;
        //current total sponsored amount for collateral
        uint256 collateral_amount_accumulated;
    }

    struct Bounds {
        //total sponsored limit
        uint256 gas_total_limit;
        uint256 collateral_total_limit;
        //single sponsor bound
        uint256 gas_bound;
        uint256 collateral_bound;
        //upper bound for single tx
        uint256 upper_bound;
    }

    //constant address used as key for small and large
    address constant small = 0x0000000000000000000000000000000000000000;
    address constant large = 0x0000000000000000000000000000000000000001;

    // for all contracts
    mapping(address => Detail) public dapps;

    // bounds for contracts
    mapping(address => Bounds) private dapp_bounds;

    mapping(address => bool) private large_contracts;
    mapping(address => bool) private custom_contracts;

    event applied(
        address indexed applicant,
        address indexed dapp,
        uint256 amount
    );

    SponsorWhitelistControl internal_sponsor = SponsorWhitelistControl(
        0x0888000000000000000000000000000000000001
    );

    constructor(Bounds memory smallBounds, Bounds memory largeBounds) public {
        //rule by internal contract
        require(
            smallBounds.upper_bound.mul(1000) <= smallBounds.gas_bound,
            "upperBound too high"
        );
        require(
            largeBounds.upper_bound.mul(1000) <= largeBounds.gas_bound,
            "upperBound too high"
        );
        //bound and limit check
        require(
            smallBounds.gas_bound <= smallBounds.gas_total_limit && 
            smallBounds.collateral_bound <= smallBounds.collateral_total_limit,
            "bound higher than limit"
        );
        require(
            largeBounds.gas_bound <= largeBounds.gas_total_limit && 
            largeBounds.collateral_bound <= largeBounds.collateral_total_limit,
            "bound higher than limit"
        );
<<<<<<< HEAD
        large_contracts[large] = true;
=======
>>>>>>> upstream/master
        dapp_bounds[small] = smallBounds;
        dapp_bounds[large] = largeBounds;
    }

    /*** Dapp dev calls ***/
    /**
     * @dev apply gas and collateral for contract
     * @param dapp contract address
     */
    function applyGasAndCollateral(address dapp)
        public
        nonReentrant
        whenNotPaused
    {
        if (_isAppliableForGas(dapp)) _applyForGas(dapp);
        if (_isAppliableForCollateral(dapp)) _applyForCollateral(dapp);
    }

    /**
     * @dev check if a contract can be sponsored and if not throw error code
     * @param dapp contract address
     */
    function isAppliable(address dapp) public returns (bool) {
        if (_isAppliableForGas(dapp) || _isAppliableForCollateral(dapp))
            return true;
        require(dapp.isContract(), "ERROR_ADDRESS_IS_NOT_CONTRACT");
        _validateApplyForGas(dapp);
        _validateApplyForCollateral(dapp);
    }

    /**
     * @dev accept sponsor's cfx
     */
    function() external payable {}

    /**
     * @dev withdraw to specific address by amount
     * @param sponsor withdrawal refund address
     * @param amount withdrawal amount
     */
    function withdraw(address payable sponsor, uint256 amount)
        public
        onlyOwner
        nonReentrant
    {
        require(address(this).balance >= amount, "amount too high");
        (bool success, ) = sponsor.call.value(amount)("");
        require(success, "withdraw failed");
    }

    /**
     * @dev set bounds for sponsorship
     * @param addr contract address to be sponsored, small => 0x0...0, large => 0x0...1, custom => contract address
     * @param bounds structed bounds for contract
     */
    function setBounds(address addr, Bounds memory bounds) public onlyWhitelistAdmin {
        if(addr != small && addr != large) {
            require(addr.isContract(), "ERROR_ADDRESS_IS_NOT_CONTRACT");
        }
        //rule by internal contract
        require(
            bounds.upper_bound.mul(1000) <= bounds.gas_bound,
            "upperBound too high"
        );
        //bound and limit check
        require(
            bounds.gas_bound <= bounds.gas_total_limit &&
            bounds.collateral_bound <= bounds.collateral_total_limit,
            "bound higher than limit"
        );
        dapp_bounds[addr] = bounds;
    }

    /**
     * @dev get contract bounds
     * @param dapp contract address
     */
    function getBounds(address dapp) public view returns (Bounds memory) {
        if(isCustomContract(dapp)) return dapp_bounds[dapp];
        if(isLargeContract(dapp)) return dapp_bounds[large];
        return dapp_bounds[small];
    } 

    /* ===== Public utility functions ===== */
    /**
     * @dev add contract addresses to large_contracts list
     * @param addrList contract address list
     */
    function addLargeContracts(address[] memory addrList) public onlyWhitelistAdmin {
        for (uint256 i = 0; i < addrList.length; i++) {
            require(addrList[i] != small && addrList[i] != large, "reserved address can't be added");
            require(addrList[i].isContract(), "ERROR_ADDRESS_IS_NOT_CONTRACT");
            if(!large_contracts[addrList[i]]) large_contracts[addrList[i]] = true;
            if (custom_contracts[addrList[i]]) {
                delete dapp_bounds[addrList[i]];
                custom_contracts[addrList[i]] = false;
            }
        }
    }

    /**
     * @dev add contract address to custom_contracts list
     * @param addr contract address
     * @param bounds bounds
     */
    function addCustomContracts(
        address addr,
        Bounds memory bounds
    ) public onlyWhitelistAdmin {
        require(addr != small && addr != large, "reserved address can't be added");
        require(addr.isContract(), "ERROR_ADDRESS_IS_NOT_CONTRACT");
        if(!custom_contracts[addr]) custom_contracts[addr] = true;
        if(large_contracts[addr]) large_contracts[addr] = false;
        setBounds(addr, bounds);
    }

    /**
     * @dev remove contract from large_contracts/custom_contracts list
     * @param addrList contract address list
     */
    function removeContract(address[] memory addrList) public onlyWhitelistAdmin {
        for (uint256 i = 0; i < addrList.length; i++) {
            if(isLargeContract(addrList[i])) {
                delete large_contracts[addrList[i]];
            } else if (isCustomContract(addrList[i])) {
                delete custom_contracts[addrList[i]];
                delete dapp_bounds[addrList[i]];
            }
        }
    }

    /**
     * @dev check if contract in large_contracts list
     * @param dapp contract address
     */
    function isLargeContract(address dapp) public view returns (bool) {
        return large_contracts[dapp];
    }

    /**
     * @dev check if contract in custom_contracts list
     * @param dapp contract address
     */
    function isCustomContract(address dapp) public view returns (bool) {
        return custom_contracts[dapp];
    }

    /*** internal helper functions ***/

    function _isAppliableForGas(address dapp) internal returns (bool) {
        if (!dapp.isContract()) return false;
        uint256 gas_balance = internal_sponsor.getSponsoredBalanceForGas(dapp);
        address current_sponsor = internal_sponsor.getSponsorForGas(dapp);
        Bounds memory current_bounds = getBounds(dapp);
        uint256 contract_gas_bound = current_bounds.gas_bound;
        uint256 contract_gas_total_limit = current_bounds.gas_total_limit; 

        if (
            current_sponsor == address(this) ||
            current_sponsor ==
            address(0x0000000000000000000000000000000000000000)
        ) {
            return
                address(this).balance >= contract_gas_bound &&
                gas_balance < contract_gas_bound &&
                dapps[dapp].gas_amount_accumulated.add(contract_gas_bound) <=
                contract_gas_total_limit;
        }

        uint256 current_upper_bound = internal_sponsor
            .getSponsoredGasFeeUpperBound(dapp);
        return
            gas_balance < current_upper_bound &&
            address(this).balance >= contract_gas_bound &&
            gas_balance < contract_gas_bound &&
            dapps[dapp].gas_amount_accumulated.add(contract_gas_bound) <=
            contract_gas_total_limit;
    }

    function _validateApplyForGas(address dapp) internal {
        address current_sponsor = internal_sponsor.getSponsorForGas(dapp);
        uint256 gas_balance = internal_sponsor.getSponsoredBalanceForGas(dapp);
        Bounds memory current_bounds = getBounds(dapp);
        uint256 contract_gas_bound = current_bounds.gas_bound;
        uint256 contract_gas_total_limit = current_bounds.gas_total_limit;

        if (
            current_sponsor != address(this) &&
            current_sponsor !=
            address(0x0000000000000000000000000000000000000000)
        ) {
            require(
                gas_balance <
                    internal_sponsor.getSponsoredGasFeeUpperBound(dapp),
                "ERROR_GAS_CANNOT_REPLACE_THIRD_PARTY_SPONSOR"
            );
        }
        require(
            address(this).balance >= contract_gas_bound,
            "ERROR_GAS_FAUCET_OUT_OF_MONEY"
        );
        require(
            gas_balance < contract_gas_bound,
            "ERROR_GAS_SPONSORED_FUND_UNUSED"
        );
        require(
            dapps[dapp].gas_amount_accumulated.add(contract_gas_bound) <=
                contract_gas_total_limit,
            "ERROR_GAS_OVER_GAS_TOTAL_LIMIT"
        );
    }

    function _isAppliableForCollateral(address dapp) internal returns (bool) {
        if (!dapp.isContract()) return false;
        uint256 collateral_balance = internal_sponsor
            .getSponsoredBalanceForCollateral(dapp);
        Bounds memory current_bounds = getBounds(dapp);
        uint256 contract_collateral_bound = current_bounds.collateral_bound;
        uint256 contract_collateral_total_limit = current_bounds.collateral_total_limit;
        
        if (
            address(this).balance >= contract_collateral_bound &&
            collateral_balance < contract_collateral_bound &&
            dapps[dapp].collateral_amount_accumulated.add(
                contract_collateral_bound
            ) <=
            contract_collateral_total_limit
        ) {
            return true;
        }
    }

    function _validateApplyForCollateral(address dapp) internal {
        uint256 collateral_balance = internal_sponsor
            .getSponsoredBalanceForCollateral(dapp);
        Bounds memory current_bounds = getBounds(dapp);
        uint256 contract_collateral_bound = current_bounds.collateral_bound;
        uint256 contract_collateral_total_limit = current_bounds.collateral_total_limit;
        
        require(
            address(this).balance >= contract_collateral_bound,
            "ERROR_COLLATERAL_FAUCET_OUT_OF_MONEY"
        );
        require(
            collateral_balance < contract_collateral_bound,
            "ERROR_COLLATERAL_SPONSORED_FUND_UNUSED"
        );
        require(
            dapps[dapp].collateral_amount_accumulated.add(
                contract_collateral_bound
            ) < contract_collateral_total_limit,
            "ERROR_COLLATERAL_OVER_COLLATERAL_TOTAL_LIMIT"
        );
    }

    function _applyForGas(address dapp) internal {
        Bounds memory current_bounds = getBounds(dapp);
        uint256 contract_gas_bound = current_bounds.gas_bound;
        uint256 contract_upper_bound = current_bounds.upper_bound; 
        
        internal_sponsor.setSponsorForGas.value(contract_gas_bound)(
            dapp,
            contract_upper_bound
        );
        dapps[dapp].gas_amount_accumulated = dapps[dapp]
            .gas_amount_accumulated
            .add(contract_gas_bound);
        emit applied(msg.sender, dapp, contract_gas_bound);
    }

    function _applyForCollateral(address dapp) internal {
        Bounds memory current_bounds = getBounds(dapp);
        uint256 contract_collateral_bound = current_bounds.collateral_bound;
        
        internal_sponsor.setSponsorForCollateral.value(
            contract_collateral_bound
        )(dapp);
        dapps[dapp].collateral_amount_accumulated = dapps[dapp]
            .collateral_amount_accumulated
            .add(contract_collateral_bound);
        emit applied(msg.sender, dapp, contract_collateral_bound);
    }
}
