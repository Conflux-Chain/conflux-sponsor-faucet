pragma solidity 0.5.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/lifecycle/Pausable.sol";
/*
interface SponsorWhitelistControl {
    // ------------------------------------------------------------------------
    // Someone will sponsor the gas cost for contract `contract_addr` with an
    // `upper_bound` for a single transaction.
    // ------------------------------------------------------------------------
    function set_sponsor_for_gas(address contract_addr, uint upper_bound) external payable;

    // ------------------------------------------------------------------------
    // Someone will sponsor the storage collateral for contract `contract_addr`.
    // ------------------------------------------------------------------------
    function set_sponsor_for_collateral(address contract_addr) external payable;

    // ------------------------------------------------------------------------
    // Add commission privilege for address `user` to some contract.
    // ------------------------------------------------------------------------
    function add_privilege(address[] calldata) external;

    // ------------------------------------------------------------------------
    // Remove commission privilege for address `user` from some contract.
    // ------------------------------------------------------------------------
    function remove_privilege(address[] calldata) external;
}
*/
contract SponsorWhitelistControl {
    // ------------------------------------------------------------------------
    // Someone will sponsor the gas cost for contract `contract_addr` with an
    // `upper_bound` for a single transaction.
    // ------------------------------------------------------------------------
    function set_sponsor_for_gas(address contract_addr, uint upper_bound) public payable {
    }

    // ------------------------------------------------------------------------
    // Someone will sponsor the storage collateral for contract `contract_addr`.
    // ------------------------------------------------------------------------
    function set_sponsor_for_collateral(address contract_addr) public payable {
    }

    // ------------------------------------------------------------------------
    // Add commission privilege for address `user` to some contract.
    // ------------------------------------------------------------------------
    function add_privilege(address[] memory) public {
    }

    // ------------------------------------------------------------------------
    // Remove commission privilege for address `user` from some contract.
    // ------------------------------------------------------------------------
    function remove_privilege(address[] memory) public {
    }
}

contract SponsorFaucet is Ownable, Pausable {
    struct detail {
        uint256 cnt;
        uint256 limit;
    }

    uint256 public gas_bound;
    uint256 public storage_bound;
    mapping(address=>detail) public dapps;
    mapping(address=>uint256) public sponsors;
    
    event applied(address dapp);
    event receieved(address sponsor, uint256 amount);

    SponsorWhitelistControl cpc = SponsorWhitelistControl(0x0888000000000000000000000000000000000001);
    
    constructor(uint256 bound, uint256 s_bound) public {
        gas_bound = bound;
        storage_bound = s_bound;
    }
    
    /*** Dapp dev calls ***/ 
    //apply cfx for gas & storage
    function applyFor(address dapp) public onlyOwner whenNotPaused {
        cpc.set_sponsor_for_gas.value(gas_bound)(dapp, gas_bound);
        cpc.set_sponsor_for_collateral.value(storage_bound)(dapp);
        dapps[dapp].cnt++;
        dapps[dapp].limit += (gas_bound+storage_bound);
        emit applied(dapp);
    }

    //accept sponsor's cfx
    function () external payable {
        require(msg.value != 0);
        sponsors[msg.sender] += msg.value;
    }

    //balance of sponsor
    function getBalance() public returns(uint256) {
        return address(this).balance;
    }
    
    //withdraw to specific address
    function withdraw(address payable sponsor) public onlyOwner whenPaused {
        require(address(this).balance > 1);
        require(sponsor.send(address(this).balance-1));
    }

    function setBound(uint256 gasBound, uint256 storageBound) public onlyOwner {
        gas_bound = gasBound;
        storage_bound = storageBound;    
    }
}
