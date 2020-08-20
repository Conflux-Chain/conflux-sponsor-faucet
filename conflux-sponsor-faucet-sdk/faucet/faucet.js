const {Conflux} = require('js-conflux-sdk');
const BigNumber = require('bignumber.js');
const faucetABI = require('./build/contracts/SponsorFaucet.json');

const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

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
            abi: faucetABI.abi,
            address: address,
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
        let gas = new BigNumber(estimateData.gasUsed)
            .multipliedBy(1.3)
            .integerValue()
            .toString();
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
        //esitmate sucks for withdraw, hard code instead
        if(call_func === this.faucet.withdraw) {
            tx.gas = 1000000;
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
        await this.tryTransact(this.faucet.applyFor, dapp);
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