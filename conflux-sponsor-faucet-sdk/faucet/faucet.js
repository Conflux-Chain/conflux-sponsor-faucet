const {Conflux} = require('js-conflux-sdk');
const BigNumber = require('bignumber.js');
//sponsor faucet contract abi
const faucet_contract = require('./build/contracts/SponsorFaucet.json');
//conflux built-in internal contract for Sponsorship
const cpc_contract = require('./build/contracts/SponsorWhitelistControl.json');

const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

//suggested factor to make sure gas is enough
const suggested_withdraw_factor = 1.8;
const suggested_factor = 1.3;

class Faucet {
    /**
     * @dev contructor for faucet
     * @param url The conflux provider url
     * @param address The faucet contract address 
     * @param privatekey The privatekey begins with '0x'
     */
    constructor(url, address, privatekey) {
        this.cfx = new Conflux({url: url});
        this.owner = this.cfx.Account(privatekey);
        this.faucet = this.cfx.Contract({
            abi: faucet_contract.abi,
            address: address,
        });
        this.cpc = this.cfx.Contract({
            abi: cpc_contract.abi,
            address: "0x0888000000000000000000000000000000000001",
        });
    }

    /**
     * @dev send tx with data loaded
     * @param call_func The contract method 
     * @param params The parameters of contract method  
     */
    async tryTransact(call_func, params) {
        let nonce = Number(await this.cfx.getNextNonce(this.owner.address));
        let estimateData = await call_func(...params).estimateGasAndCollateral();
        let gas;
        if (call_func === this.faucet.withdraw) {
            gas = new BigNumber(estimateData.gasUsed)
            .multipliedBy(suggested_withdraw_factor)
            .integerValue()
            .toString();
        } else {
            gas = new BigNumber(estimateData.gasUsed)
            .multipliedBy(suggested_factor)
            .integerValue()
            .toString();
        }
        let data = call_func(...params).data;
        let tx = {
            from: this.owner,
            to: this.faucet.address,
            gas: gas,
            gasPrice: 1,
            nonce: nonce,
            data: data,
            value: 0,
        }
        
        let tx_hash = await this.cfx.sendTransaction(tx);
        let receipt = await this.waitForReceipt(tx_hash);
        if(receipt.outcomeStatus !== 0) throw new Error('send tx failed!');
    }

    /**
     * @dev wait for receipt of transaction
     * @param hash The tx hash
     */
    async waitForReceipt(hash) {
        for (;;) {
            let res = await this.cfx.getTransactionReceipt(hash);
            if (res != null) {
              if (
                res.stateRoot !==
                '0x0000000000000000000000000000000000000000000000000000000000000000'
              ) {
                return res;
              }
            }
            await sleep(30000);
        }
    }
    
    /**
     * @dev apply to be sponsored
     * @param dapp The address of dapp 
     */
    async apply(dapp) {
        await this.tryTransact(this.faucet.applyFor, [dapp]);
    }

    /**
     * @dev apply for gas
     * @param dapp The address of dapp
     */
    async applyForGas(dapp) {
        await this.tryTransact(this.faucet.applyForGas, [dapp]);
    }

    /**
     * @dev apply for collateral
     * @param dapp The address of dapp 
     */
    async applyForCollateral(dapp) {
        await this.tryTransact(this.faucet.applyForCollateral, [dapp]);
    }

    /**
     * @dev withdraw from faucet
     * @param address The sponsor faucet address 
     * @param amount The amout to be withdrawn
     */
    async withdraw(address, amount) {
        await this.tryTransact(this.faucet.withdraw, [address, amount]);
    }

    /**
     * @dev force pause
     */
    async pause() {
        await this.tryTransact(this.faucet.pause, []);
    }
}

module.exports = {
    Faucet: Faucet,
};