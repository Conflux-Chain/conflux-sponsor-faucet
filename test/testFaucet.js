const {Conflux} = require('js-conflux-sdk');
const config = require('./config.js').config;
const {gasBound, storageBound, value, dapp} = config.info;
const fs = require('fs');
const BigNumber = require('bignumber.js');
const cfx = new Conflux({url: config.cfx_oceanus});

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

async function waitNonce(target, acc) {
    let x;
    for (;;) {
      x = Number(await cfx.getNextNonce(acc));
      if (x < target) {
        await sleep(5000);
        continue;
      }
      break;
    }
    return x;
  }

const price = 111;

/*
deploy Faucet
->sponsor send cfx
->dapp apply
*/
let owner = cfx.Account(config.cfx_owner);

async function deploy() {
    let receipt;
    let nonce = Number(await cfx.getNextNonce(owner.address));
    let p = [];

    console.log('deploy Proxy');
    let proxy = cfx.Contract({
        abi: config.faucet_contract.abi,
        bytecode: config.faucet_contract.bytecode,
    });

    let tx_hash = await proxy
        .constructor(
            gasBound,
            storageBound,
        )
        .sendTransaction({
            from: owner,
            gas: 10000000,
            nonce: nonce,
            gasPrice: price,
            storageLimit: 10000000,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('deploy failed!');
    let proxy_addr = receipt.contractCreated;
    console.log('faucet contract address: ', proxy_addr);
    proxy = cfx.Contract({
        abi: config.faucet_contract.abi,
        address: proxy_addr,
    })
    nonce++;

    //sponsor first send cfx
    console.log('send cfx to faucet');
    tx_hash = await cfx.sendTransaction({
        from: owner,
        to: proxy_addr,
        gas: 10000000,
        nonce: nonce,
        gasPrice: price,
        value: value,
    });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('init sponsor failed!');
    nonce++;

    //get faucet balance
    console.log('get faucet balance');
    let balance = await proxy.getBalance();
    console.log(balance);

    //Dapp Dev apply to get 
    console.log('apply to faucet');
    tx_hash = await proxy.applyFor(dapp)
        .sendTransaction({
            from: owner,
            gas: 10000000,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('apply failed!');
    nonce++;

    //withdraw from faucet
    console.log('withdraw');
    tx_hash = await proxy.withdraw(owner)
        .sendTransaction({
            from: owner,
            gas: 10000000,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('withdraw failed!');
    nonce++;
    balance = await proxy.getBalance();
    console.log('balance after withdraw: ' + balance);
}

async function withdraw(address) {
    let receipt;
    let nonce = Number(await cfx.getNextNonce(owner.address));

    let proxy = cfx.Contract({
        abi: config.faucet_contract.abi,
        address: address,
    });
    
    tx_hash = await proxy.withdraw(owner).estimateGasAndCollateral();
    console.log(BigNumber(tx_hash.gasUsed).multipliedBy(1.5)
    .integerValue()
    .toString());
    console.log(JSON.stringify(tx_hash));
    /*
    .sendTransaction({
            from: owner,
            gas: 10000000,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('withdraw failed!');
    nonce++;
    balance = await proxy.getBalance();
    console.log('balance after withdraw: ' + balance);
    */
}


withdraw('0x8a13c413c861048d9471412c8046f66d3401c7b0');
//deploy();