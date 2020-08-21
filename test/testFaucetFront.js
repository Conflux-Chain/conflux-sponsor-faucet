const fs = require('fs');
const Conflux = require('js-conflux-sdk');

const config = require('./config.js').config;
const cfx = new Conflux.Conflux({url: config.cfx_oceanus});
const owner = cfx.Account(config.cfx_owner);
const address = JSON.parse(
    fs.readFileSync(__dirname + '/address.json'),
);

const Faucet = require('../src/faucet-frontend.js');
const faucet = new Faucet.Faucet('http://18.182.200.167:12537', address.faucet_address);

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

async function test() {
    let tx_hash;
    let receipt;
    /*
    let sponsor_faucet = cfx.Contract({
        abi:config.faucet_contract.abi,
        address: address.faucet_address,
    })
    tx_hash = await sponsor_faucet
        .unpause()
        .sendTransaction({
            from: owner,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('unpause failed!');
    console.log('receipt: ', receipt);
    */
    let applyTx = await faucet.apply(address.dapp_address, owner.address);
    console.log('res tx: ', applyTx);
    applyTx.from = owner;
    tx_hash = await cfx.sendTransaction(applyTx);
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('apply failed!');
}

test();
