pragma solidity 0.5.11;

contract pay {
    function () external payable {}
    function withdraw(address payable sponsor, uint256 amount) public {
        require(address(this).balance >= amount, "amount too high");
        //require(sponsor.send(amount), "withdraw failed");
        (bool success, ) = sponsor.call.value(amount)("");
        require(success, "withdraw failed");
    }

    function withdrawAll(address payable sponsor) public {
        (bool success, ) = sponsor.call.value(address(this).balance)("");
        require(success, "withdraw failed");
    }
}