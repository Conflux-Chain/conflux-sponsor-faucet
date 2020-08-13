const {Conflux} = require('js-conflux-sdk');
const config = require('../test/config.js').config;
const BigNumber = require('bignumber.js');

const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

async function waitForReceipt(hash) {
    for (;;) {
        let res = await cfx.getTransactionReceipt(hash);
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

const price = 111;

class Faucet {
    constructor(url, address) {
        this.cfx = new Conflux({url: url});
        this.owner = cfx.Account(config.cfx_owner);
        this.proxy = cfx.Contract({
            abi: config.faucet_contract.abi,
            address: address,
        });
    }

    async tryTransact() {

    }
    //get sponsored contract balance
    async getDappBalance(dapp) {
        
    }

    //apply to get sponsored
    async function apply(dapp) {
        let nonce = Number(await this.cfx.getNextNonce(owner.address));
        let estimateData = await this.proxy.applyFor(dapp).estimateGasAndCollateral();
        let gas = new BigNumber(estimateData.gasUsed)
            .multipliedBy(1.5)
            .integerValue()
            .toString();
        
        let tx_hash = await this.proxy.applyFor(dapp)
            .sendTransaction({
                from: this.owner,
                gas: gas,
                nonce: nonce,
                gasPrice: price,
            });
        let receipt = await waitForReceipt(tx_hash);
        if(receipt.outcomeStatus !== 0) throw new Error('apply failed!');
        return true;
    }

    //withdraw
    async function withdraw(amount) {

    }

    //force pause
    async function pause() {
        
    }

}

module.exports = {
    Faucet: Faucet,
};