const {Conflux} = require('js-conflux-sdk');
const config = require('./config.js').config;
const {gasTotalLimit, collateralTotalLimit, gasBound, storageBound, value, upperBound,
       generalGasTotalLimit, generalCollateralTotalLimit, generalGasBound, generalStorageBound,
       generalValue, generalUpperBound
} = config.info;
const fs = require('fs');
const program = require('commander');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const w3 = new Web3();
const cfx = new Conflux({url: config.cfx_testnet});
const internalContract = require('../build/contracts/SponsorWhitelistControl.json');
const AdminControl = require('../build/contracts/AdminControl.json');
const testFaucet = require('../build/contracts/testFaucet.json');
const dappN = require('../build/contracts/dappN.json');

const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
const internal_contractAddr = '0x0888000000000000000000000000000000000001';
  
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

const price = 1;
const admin_contract_addr = '0x0888000000000000000000000000000000000000';

//let owner = cfx.Account(config.cfx_owner);
//let new_owner = cfx.Account(config.cfx_user);
let new_owner = cfx.wallet.addPrivateKey(config.cfx_user);
let zero = cfx.wallet.addPrivateKey(config.cfx_testUser);
//let oneCFX = cfx.wallet.addPrivateKey(config.cfx_user); 
let testUser = cfx.wallet.addPrivateKey(config.test_wcfx);
let wcfx = cfx.wallet.addPrivateKey(config.wcfx);
let faucet_owner = new_owner;
//= cfx.Account(config.faucet_owner);

async function deployTestDappN() {
    let receipt;
    let nonce = Number(await cfx.getNextNonce(new_owner.address));
    
    let dapp = cfx.Contract({
        abi: dappN.abi,
        bytecode: dappN.bytecode,
    })
    
    let tx_hash = await dapp
        .constructor('0x0000000000000000000000000000000000000000')
        .sendTransaction({
            from: new_owner,
            nonce: nonce,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('dapp deploy failed!');
    let dapp_addr = receipt.contractCreated;
    console.log('test dapp contract address: ', dapp_addr);
    nonce++;
    
    dapp = cfx.Contract({
        abi: dappN.abi,
        address: dapp_addr,
    })

    let res = {};
    res.dapp_address = dapp_addr;
    fs.writeFileSync(
        __dirname + '/testDappAddress.json',
        JSON.stringify(res),
    );
    /*
    console.log('dapp add user');
    tx_hash = await dapp.add('0x0000000000000000000000000000000000000000')
        .sendTransaction({
            from: new_owner,
            //gas: 1000000,
            //gasPrice: 1,
            nonce: nonce,
        });
    console.log('tx_hash: ', tx_hash);
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('dapp add user failed!');
    nonce++;
    */
}

/*
deploy faucet ->
deploy dapp ->
send cfx to faucet ->
check if appliable ->
apply dapp to faucet ->
zero balance user call dapp set function -> check if set success
faucet out of money ->
set new bounds -> apply dapp2 to check new bounds
3rd part sponsor engage 
    -> gas, collateral
    -> check isAppliable
faucet continue to be sponsor
check params of 
pause/unpause->
withdraw
*/

async function deployOnly() {
    let receipt;
    let nonce = Number(await cfx.getNextNonce(new_owner.address));

    //deploy faucet 
    console.log('deploy faucet');
    let faucet = cfx.Contract({
        abi: config.faucet_contract.abi,
        bytecode: config.faucet_contract.bytecode,
    });

    let tx_hash = await faucet
        .constructor(
            gasTotalLimit,
            collateralTotalLimit,
            gasBound,
            storageBound,
            upperBound,
        )
        .sendTransaction({
            from: new_owner,
            nonce: nonce,
            gasPrice: price,
        });
    console.log('deploy txHash: ', tx_hash);
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('faucet deploy failed!');
    let faucet_addr = receipt.contractCreated;
    console.log('faucet contract address: ', faucet_addr);
    faucet = cfx.Contract({
        abi: config.faucet_contract.abi,
        address: faucet_addr,
    })
    nonce++;
    
    /*
    tx_hash = await faucet.setBounds(0, 0, 0, 0, 0)
        .sendTransaction({
            from: new_owner,
            nonce: nonce,
        });
    receipt = await waitForReceipt(tx_hash);
    
    let res = {}
    res.faucet_address = faucet_addr;
    fs.writeFileSync(
        __dirname + '/faucet_address.json',
        JSON.stringify(res),
    );
    */
}

async function deploy() {
    let receipt;
    let nonce = Number(await cfx.getNextNonce(new_owner.address));

    //deploy faucet 
    console.log('deploy faucet');
    let faucet = cfx.Contract({
        abi: config.faucet_contract.abi,
        bytecode: config.faucet_contract.bytecode,
    });

    let tx_hash = await faucet
        .constructor(
            [
                gasTotalLimit,
                collateralTotalLimit,
                gasBound,
                storageBound,
                upperBound ],
            [   
                generalGasTotalLimit,
                generalCollateralTotalLimit,
                generalGasBound,
                generalStorageBound,
                generalUpperBound ]
        )
        .sendTransaction({
            from: new_owner,
            nonce: nonce,
            price: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('faucet deploy failed!');
    let faucet_addr = receipt.contractCreated;
    console.log('faucet contract address: ', faucet_addr);
    faucet = cfx.Contract({
        abi: config.faucet_contract.abi,
        address: faucet_addr,
    })
    nonce++;
    

    //deploy dapp
    console.log('deploy dapp'); 
    let dapp = cfx.Contract({
        abi: config.dapp_contract.abi,
        bytecode: config.dapp_contract.bytecode,
    })

    tx_hash = await dapp
        .constructor('0x0000000000000000000000000000000000000000')
        .sendTransaction({
            from: new_owner,
            nonce: nonce,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('dapp deploy failed!');
    let dapp_addr1 = receipt.contractCreated;
    console.log('test dapp 1 contract address: ', dapp_addr1);
    let dapp1 = cfx.Contract({
        abi: config.dapp_contract.abi,
        address: dapp_addr1,
    });
    nonce++;

    tx_hash = await dapp
        .constructor('0x0000000000000000000000000000000000000000')
        .sendTransaction({
            from: new_owner,
            nonce: nonce,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('dapp deploy failed!');
    let dapp_addr2 = receipt.contractCreated;
    console.log('test dapp 2 contract address: ', dapp_addr2);
    let dapp2 = cfx.Contract({
        abi: config.dapp_contract.abi,
        address: dapp_addr2,
    });
    nonce++;

    tx_hash = await dapp
        .constructor('0x0000000000000000000000000000000000000000')
        .sendTransaction({
            from: new_owner,
            nonce: nonce,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('dapp deploy failed!');
    let dapp_addr3 = receipt.contractCreated;
    console.log('test dapp 3 contract address: ', dapp_addr3);
    let dapp3 = cfx.Contract({
        abi: config.dapp_contract.abi,
        address: dapp_addr3,
    });
    nonce++;
    
    let res = {}
    res.faucet_address = faucet_addr;
    res.dapp_1 = dapp_addr1;
    res.dapp_2 = dapp_addr2;
    res.dapp_3 = dapp_addr3;
    fs.writeFileSync(
        __dirname + '/address.json',
        JSON.stringify(res),
    );

    //sponsor first send cfx
    console.log('send cfx to faucet');
    tx_hash = await cfx.sendTransaction({
        from: new_owner,
        to: faucet_addr,
        gas: 21040,
        nonce: nonce,
        gasPrice: 1,
        value: value,
    });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('init sponsor failed!');
    nonce++;

    let faucet_balance = Number(await cfx.getBalance(faucet_addr));
    console.log('faucet current balance: ', faucet_balance);

    /*
    let estimateData = await dapp.set(faucet_addr, 42).estimateGasAndCollateral();
    let gas = new BigNumber(estimateData.gasUsed)
        .multipliedBy(1.3)
        .integerValue()
        .toString();
    console.log('estimated dapp set upper_bound: ', gas);
    */
    
    //dapp1 small quota, dapp2 general quota, dapp3 special quota
    //add dapp2 to general contracts list
    console.log('add dapp2 to large contracts list');
    tx_hash = await faucet.addLargeContracts([dapp_addr2])
        .sendTransaction({
            from: new_owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('add large contracts failed!');
    nonce++;
    
    //add dapp3 to general contracts list
    console.log('add dapp3 to custom contracts list');
    tx_hash = await faucet.addCustomContracts([dapp_addr3], [[
            2*generalGasTotalLimit,
            2*generalCollateralTotalLimit,
            2*generalGasBound,
            2*generalStorageBound,
            2*generalUpperBound
        ]])
        .sendTransaction({
            from: new_owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: price, 
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('add custom contracts failed!');
    nonce++;
    
    //set special bounds for dapp3
    /*
    console.log('set custom bounds for dapp3');
    tx_hash = await faucet
        .setBounds(
            dapp_addr3,
            [
                2*generalGasTotalLimit,
                2*generalCollateralTotalLimit,
                2*generalGasBound,
                2*generalStorageBound,
                2*generalUpperBound
            ]
        )
        .sendTransaction({
            from: new_owner,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('set custom bounds for dapp3 failed!');
    nonce++;
    */
   
    //dapp1
    //Dapp Dev apply to get 
    console.log('check if appliable');
    let isAppliable = await cfx.call({
        to: faucet_addr,
        data: faucet.isAppliable(dapp_addr1).data,
    });
    console.log('isApplialbe cfx_call return: ', isAppliable);

    console.log('apply dapp1 to faucet');
    tx_hash = await faucet.applyGasAndCollateral(dapp_addr1)
        .sendTransaction({
            from: new_owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('dapp1 apply failed!');
    nonce++;
    
    //dapp2 
    console.log('check appliable for dapp2 ');
    isAppliable = await faucet.isAppliable(dapp_addr2).call();
    console.log('dapp2 isAppliable: ', isAppliable);

    console.log('apply dapp2 to faucet');
    tx_hash = await faucet.applyGasAndCollateral(dapp_addr2)
        .sendTransaction({
            from: new_owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('dapp2 apply failed!');
    nonce++;
    
    //dapp3
    console.log('check appliable for dapp3 ');
    isAppliable = await faucet.isAppliable(dapp_addr3).call();
    console.log('dapp3 isAppliable: ', isAppliable);

    console.log('apply dapp3 to faucet');
    tx_hash = await faucet.applyGasAndCollateral(dapp_addr3)
        .sendTransaction({
            from: new_owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('dapp3 apply failed!');
    nonce++;
    
    /*
    //dapp add user
    console.log('dapp add user');
    tx_hash = await dapp.add(testUser)
        .sendTransaction({
            from: new_owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('dapp add user failed!');
    nonce++;
    */
    
    //dapp1 set
    let userNonce = Number(await cfx.getNextNonce(zero.address));
    console.log('zero nonce: ', userNonce);
    console.log('dapp1 set');
    try {
        tx_hash = await dapp1.set(faucet_addr, 42)
            .sendTransaction({
                from: zero,
                nonce: userNonce,
            });
        console.log('dapp1 set hash: ', tx_hash);
        receipt = await waitForReceipt(tx_hash);
        if(receipt.outcomeStatus !== 0) throw new Error('dapp1 set failed!');
        userNonce++;
    } catch(e) {
        console.error(e);
    }
    //dapp1 get
    let record = Number(await dapp1.record(faucet_addr).call());
    console.log('dapp1 record: ', record);

    //dapp2 set
    console.log('dapp2 set');
    try {
        tx_hash = await dapp2.set(faucet_addr, 42)
            .sendTransaction({
                from: zero,
                nonce: userNonce,
            });
        console.log('dapp2 set hash: ', tx_hash);
        receipt = await waitForReceipt(tx_hash);
        if(receipt.outcomeStatus !== 0) throw new Error('dapp2 set failed!');
        userNonce++;
    } catch(e) {
        console.error(e);
    }
    //dapp2 get
    record = Number(await dapp2.record(faucet_addr).call());
    console.log('dapp2 record: ', record);

    //dapp3 set
    console.log('dapp3 set');
    try {
        tx_hash = await dapp3.set(faucet_addr, 42)
            .sendTransaction({
                from: zero,
                nonce: userNonce,
            });
        console.log('dapp3 set hash: ', tx_hash);
        receipt = await waitForReceipt(tx_hash);
        if(receipt.outcomeStatus !== 0) throw new Error('dapp3 set failed!');
        userNonce++;
    } catch(e) {
        console.error(e);
    }
    //dapp3 get
    record = Number(await dapp3.record(faucet_addr).call());
    console.log('dapp3 record: ', record);


    //check sponsored balance
    let internalSponsor = cfx.Contract({
        abi: internalContract.abi,
        address: internal_contractAddr,
    });
    let current_sponsoredGasBalance = Number(await internalSponsor.getSponsoredBalanceForGas(dapp_addr1).call());
    console.log('current_sponsoredGasBalance: ', current_sponsoredGasBalance);
}

async function testCol() {
    let internalSponsor = cfx.Contract({
        abi: internalContract.abi,
        address: internal_contractAddr,
    });
    
    let testContract = cfx.Contract({
        abi: config.test_contract.abi,
        bytecode: config.test_contract.bytecode,
    });

    let nonce = Number(await cfx.getNextNonce(new_owner.address));
    let tx_hash = await testContract.constructor()
        .sendTransaction({
            from: new_owner,
            nonce: nonce,
        })
    let receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('testContract deploy failed!');
    let testContract_addr = receipt.contractCreated;
    console.log('testContract address: ', testContract_addr);
    testContract = cfx.Contract({
        abi: config.test_contract.abi,
        address: testContract_addr,
    });
    nonce++;

    let isAllWhitelisted = await internalSponsor.isAllWhitelisted(testContract_addr).call();
    console.log('before add privilege isAllWhitelisted value is: ', isAllWhitelisted);

    console.log('add privilege');
    tx_hash = await internalSponsor.addPrivilegeByAdmin(testContract_addr, ['0x0000000000000000000000000000000000000000'])
        .sendTransaction({
            from: new_owner,
            //gas: 1000000,
            nonce: nonce,
            //gasPrice: 1,
        });
    console.log('add privilege txhash: ', tx_hash);
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('add privilege failed!');
    nonce++;
    console.log('privilege added');

    isAllWhitelisted = await internalSponsor.isAllWhitelisted(testContract_addr).call();
    console.log('isAllWhitelisted value is: ', isAllWhitelisted);
    
    tx_hash =  await internalSponsor.removePrivilegeByAdmin(testContract_addr, ['0x0000000000000000000000000000000000000000'])
        .sendTransaction({
            from: new_owner,
            //gas: 1000000,
            nonce: nonce,
            //gasPrice: 1,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('rm privilege failed!');
    nonce++;
    console.log('privilege removed');

    isAllWhitelisted = await internalSponsor.isAllWhitelisted(testContract_addr).call();
    console.log('isAllWhitelisted value is: ', isAllWhitelisted);
    
    let userNonce = Number(await cfx.getNextNonce(wcfx.address));
    console.log('add privilege by non-admin');
    tx_hash = await internalSponsor.addPrivilegeByAdmin(testContract_addr, ['0x0000000000000000000000000000000000000000'])
        .sendTransaction({
            from: wcfx,
            //gas: 1000000,
            nonce: userNonce,
            //gasPrice: 1,
        });
    console.log('add privilege txhash: ', tx_hash);
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('add privilege failed!');
    console.log('privilege added by non-admin');
    
    isAllWhitelisted = await internalSponsor.isAllWhitelisted(testContract_addr).call();
    console.log('isAllWhitelisted value is: ', isAllWhitelisted);
}

async function testDapp(address) {
    let nonce = Number(await cfx.getNextNonce(wcfx.address));
    let balance = Number(await cfx.getBalance(wcfx.address));
    console.log('balance before call dapp:', balance/1e18);
    let tx_hash;
    let p = [];
    //for(let i = 0; i < 1; i++) {
        try {    
            tx_hash = await cfx.sendTransaction({
                from: wcfx,
                to: address,
                nonce: nonce,
                gas: 2e6,
                gasPrice: 1e9,
            });
            //p.push(waitForReceipt(tx_hash));
            nonce++;
            console.log('nonce: ', nonce);
            console.log('txhash: ', tx_hash);
            let receipt = await waitForReceipt(tx_hash);
            if(receipt.outcomeStatus !== 0) throw new Error('test dapp failed');
        } catch (e) {
            console.error(e);
        }
    //}
    let new_balance = Number(await cfx.getBalance(wcfx.address));
    console.log('charged cfx:', Number(balance/1e18 - new_balance/1e18));
    //await Promise.all(p);
}

async function pause(address) {
    let receipt;
    let tx_hash;
    let faucet = cfx.Contract({
        abi: config.faucet_contract.abi,
        address: address,
    });
    let isPaused = await faucet.paused().call();
    let nonce = Number(await cfx.getNextNonce(faucet_owner.address));
    console.log('faucet is paused: ', isPaused);
    console.log('pauce faucet');
    tx_hash = await faucet.pause()
        .sendTransaction({
            from: faucet_owner,
            //gas: 1000000,
            nonce: nonce,
            //gasPrice: price,
        });
    console.log('pause txHash: ', tx_hash)
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('pause failed!');
    nonce++;
}

async function unpause(address) {
    let receipt;
    let tx_hash;
    let faucet = cfx.Contract({
        abi: config.faucet_contract.abi,
        address: address,
    });
    let isPaused = await faucet.paused().call();
    let nonce = Number(await cfx.getNextNonce(faucet_owner.address));
    console.log('faucet is paused: ', isPaused);
    console.log('unpauce faucet');
    tx_hash = await faucet.unpause()
        .sendTransaction({
            from: faucet_owner,
            //gas: 1000000,
            nonce: nonce,
            //gasPrice: price,
        });
    console.log('unpause txHash: ', tx_hash)
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('pause failed!');
    nonce++;
}

async function addPauser(address) {
    let receipt;
    let tx_hash;
    let faucet = cfx.Contract({
        abi: config.faucet_contract.abi,
        address: address,
    });
    let isPaused = await faucet.paused().call();
    let nonce = Number(await cfx.getNextNonce(faucet_owner.address));
    console.log('faucet is paused: ', isPaused);
    console.log('add Pauser');
    tx_hash = await faucet.addPauser(config.faucet_newOwner)
        .sendTransaction({
            from: faucet_owner,
            //gas: 1000000,
            nonce: nonce,
            //gasPrice: price,
        });
    console.log('addPauser txHash: ', tx_hash)
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('addPauser failed!');
    nonce++;
}

async function renouncePauser(address) {
    let receipt;
    let tx_hash;
    let faucet = cfx.Contract({
        abi: config.faucet_contract.abi,
        address: address,
    });
    let isPaused = await faucet.paused().call();
    let nonce = Number(await cfx.getNextNonce(faucet_owner.address));
    console.log('faucet is paused: ', isPaused);
    console.log('renounce Pauser');
    tx_hash = await faucet.renouncePauser()
        .sendTransaction({
            from: faucet_owner,
            //gas: 1000000,
            nonce: nonce,
            //gasPrice: price,
        });
    console.log('renouncePauser txHash: ', tx_hash)
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('renouncePauser failed!');
    nonce++;
}

async function withdraw(address) {
    let receipt;
    let tx_hash;
    let nonce = Number(await cfx.getNextNonce(faucet_owner.address));
    let balance = Number(await cfx.getBalance(address));
    console.log('faucet current balance: ', balance);
    
    let faucet = cfx.Contract({
        abi: config.faucet_contract.abi,
        address: address,
    });

    let contractOwner = await faucet.owner().call();
    console.log('contract owner is: ', contractOwner);
    
    let val = w3.utils.toHex(new BigNumber(balance));
    tx_hash = await faucet.withdraw(faucet_owner, val)
        .sendTransaction({
            from: faucet_owner,
            //gas: 1000000,
            nonce: nonce,
            //gasPrice: 1,
        });
    receipt = await waitForReceipt(tx_hash);
    console.log(receipt);
    if(receipt.outcomeStatus !== 0) throw new Error('withdraw failed!');
}

async function transferOwnerShip(address) {
    let receipt;
    let tx_hash;
    let nonce = Number(await cfx.getNextNonce(faucet_owner.address));
    
    let faucet = cfx.Contract({
        abi: config.faucet_contract.abi,
        address: address,
    });
    tx_hash = await faucet.transferOwnership(config.faucet_newOwner)
        .sendTransaction({
            from: faucet_owner, 
            nonce: nonce,
        });
    console.log('transferOwnerShip txHash: ', tx_hash);
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('transferOwnerShip failed!'); 
}

async function setAdmin(address) {
    let receipt;
    let tx_hash;
    let nonce = Number(await cfx.getNextNonce(faucet_owner.address));
    
    let AdminControlContract = cfx.Contract({
        abi: AdminControl.abi,
        address: admin_contract_addr,
    });
    //set new admin
    tx_hash = await AdminControlContract.setAdmin(address, config.faucet_newOwner)
        .sendTransaction({
            from: faucet_owner,
            nonce: nonce,
        });
    receipt = await waitForReceipt(tx_hash);
    console.log('set new Admin txHash: ', tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('set new admin tx failed!');
    nonce++;
}

program
  .option('-t, --ut', 'unit test for faucet')
  .option('-d, --deploy', 'deploy faucet contract')
  .option('-p, --faucet [type]', 'pause faucet')
  .option('-u, --faucetunpause [type]', 'pause faucet')
  .option('-w, --address [type]', 'withdraw from faucet')
  //.option('-t, --test', 'test whitelist')
  .option('-c, --dapp [type]', 'cost gas fee')
  .option('-n, --dappN', 'test dapp add')
  .option('-o, --faucetAddr [type]', 'transfer owner ship')
  .option('-s, --admin [type]', 'set new admin')
  .option('-a, --pauser [type]', 'add new pauser')
  .option('-r, --repauser [type]', 'renounce pauser')
  .parse(process.argv);


if(program.ut) {
    deploy();
}
//transferOwnerShip
if(program.faucetAddr){
    transferOwnerShip(program.faucetAddr);
}

if(program.admin) {
    setAdmin(program.admin);
}

if(program.dappN) {
    deployTestDappN();
}

if(program.test) {
    testCol();
}

if(program.dapp) {
    testDapp(program.dapp);
}

if(program.deploy) {
    deployOnly()
}

if(program.faucet) {
    pause(program.faucet);
}
if(program.pauser) {
    addPauser(program.pauser);
}

if(program.repauser) {
    renouncePauser(program.repauser);
}

if(program.faucetunpause) {
   unpause(program.faucetunpause);
}

if(program.address) {
    console.log(program.address);
    withdraw(program.address);
}