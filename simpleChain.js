/* ===== SHA256 with Crypto-js ===============================
|  Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');

/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

// Add data to levelDB with key/value pair
function addLevelDBData(key,value) {
  db.put(key, value, function(err) {
    if (err) return console.log('Block ' + key + ' submission failed', err);
  });
}

// Get data from levelDB with key
function getLevelDBData(key) {
    return new Promise((resolve, reject) => {
    let block;
    db.get(key, function(err, value) {
      if (err) { reject('error ', err); }
      block = JSON.parse(value);
      resolve(block);
    });
  }).catch(error => { console.log(error); });
}

// Add data to levelDB with value
function addDataToLevelDB(value) {
  let i = 0;
  db.createReadStream().on('data', function(data) {
        i++;
      }).on('error', function(err) {
          return console.log('Unable to read data stream!', err);
      }).on('close', function() {
        console.log('Block #' + i);
        addLevelDBData(i, value);
      });
}

/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block {
	constructor(data){
     this.hash = "",
     this.height = 0,
     this.body = data,
     this.time = 0,
     this.previousBlockHash = "";
    }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain {
  constructor(){
    this.chain = [];
    this.addBlock(new Block('Genesis Block'));
    this.height = 0;
  }

  // Add new block
  addBlock(newBlock){
    newBlock.height = this.chain.length; // Block height
    newBlock.time = new Date().getTime().toString().slice(0,-3); // UTC timestamp
    newBlock.hash = SHA256(JSON.stringify(newBlock)).toString(); // Block hash with SHA256 using newBlock and converting to a string

    // previous block hash
    if(this.chain.length > 0) {
      newBlock.previousBlockHash = this.chain[this.chain.length-1].hash;
    }

    // Adding block object to chain
  	this.chain.push(newBlock);

    // Store in LevelDB
    addLevelDBData(newBlock.height, JSON.stringify(newBlock));
    addLevelDBData('height', newBlock.height);
  }

  //Get current block height from LevelDB
  getBlockHeight() {
    return new Promise((resolve, reject) => {
      getLevelDBData('height')
      .then(result => {
        resolve(result);
      });
    }).catch(error => console.log('Get block height error: ', error));
  }

  //Get block by height from LevelDB
  getBlock(blockHeight) {
    return new Promise((resolve, reject) => {
      getLevelDBData(blockHeight) //Return object as a single string
      .then(result => {
        resolve(result);
      });
    }).catch(error => console.log('Get Block error :', error));
  }

  //Validate Block
  validateBlock(blockHeight) {
    return new Promise((resolve, reject) => {
      this.getBlock(blockHeight)
      .then(block => { //get block object
        let blockHash = block.hash;  //get block hash
        block.hash = '';  //remove block hash to test block integrity
        let validBlockHash = SHA256(JSON.stringify(block)).toString();
        if (blockHash === validBlockHash) { //generate block hash
          console.log('Block validated');
          resolve(true);
        } else {
          console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
          reject(error);
        }
      });
    }).catch(error => console.log('Validate Block error: ', error));
  }

  // Validate blockchain
  validateChain() {
    let errorLog = [];
    let blocks = [];

    this.getBlockHeight().then(chainHeight => {

      for (let i = 0; i <= chainHeight; i++) {
        this.validateBlock(i).then(result => {if (!result) errorLog.push(result); }); //validate blocks
        blocks.push(this.getBlock(i));
      }

      Promise.all(blocks).then(result => {
        console.log('First Hash', result[0].hash);

        if (result.length > 1) {
          for (let b = 1; b <= result.length; b++) {

            let blockHash = result[b].hash;
            let previousHash = (result[b+1]) ? result[b+1].previousBlockHash : null;

            if (blockHash !== previousHash && previousHash !== null) {
              errorLog.push('Error linking blockchain at block position #', b);
            }
          }  
        }
      });
    });

    if (errorLog.length > 1 ) {
      return errorLog;
    }

    return true;
  }

}
