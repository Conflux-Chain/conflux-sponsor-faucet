pragma solidity 0.5.11;
import "./InternalContract.sol";

contract dapp {
    mapping(address=>uint256) public record;

    function set(address key, uint256 val) public {
        record[key] = val;
    }

    function add(address account) public {
        SponsorWhitelistControl cpc = SponsorWhitelistControl(0x0888000000000000000000000000000000000001);
        address[] memory a = new address[](1);
        a[0] = account;
        cpc.add_privilege(a);
    }
}