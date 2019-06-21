import { SeraphIDAccount } from '../account';
import { ISchema } from '../common';
import { SeraphIDIssuer } from '../issuer';
import { SeraphIDWallet } from '../wallet';
import testData from './test-data.json';

interface ITestData {
  account: SeraphIDAccount;
  issuer: SeraphIDIssuer;
  wallet: SeraphIDWallet;
}

function getTestData(): ITestData {
  const testObj: ITestData = {
    account: new SeraphIDAccount(testData.walletOwnerPrivateKey),
    issuer: new SeraphIDIssuer(testData.scriptHash, testData.neoRpcUrl, testData.neoscanUrl),
    wallet: new SeraphIDWallet({ name: testData.walletName }),
  };
  testObj.wallet.addAccount(testObj.account);

  return testObj;
}

afterAll(async done => {
  done();
});

test('Wallet.addClaim', async () => {
  const testObj = getTestData();
  // create and store claim
  const claim = testObj.issuer.createClaim(
    'TestClaimID',
    testData.existingSchema.name,
    testData.claimAttributes,
    testObj.account.getDID(),
    new Date(),
    new Date(),
  );

  expect(testObj.wallet.addClaim(claim)).toBeUndefined();

  // retrieve claim from wallet
  const retrievedClaim = testObj.wallet.getClaim(claim.id);
  expect(retrievedClaim).toEqual(claim);
});

test('Wallet.addClaim.encrypted', async () => {
  const testObj = getTestData();
  const claim = testObj.issuer.createClaim(
    'testid',
    testData.existingSchema.name,
    testData.claimAttributes,
    'test',
    new Date(),
    new Date(),
  );

  await testObj.account.encrypt(testData.walletPassword);
  expect(testObj.account.addClaim(claim)).toBeUndefined();
  await testObj.account.decrypt(testData.walletPassword);
  expect(testObj.account.addClaim(claim)).toBeUndefined();
}, 10000);

test('Wallet.export.import', async () => {
  const testObj = getTestData();
  // create keys and wallet
  const testAccount = new SeraphIDAccount(testData.walletOwnerPrivateKey);
  const testWallet = new SeraphIDWallet({ name: testData.walletName });
  testWallet.addAccount(testAccount);

  // generate claim from issuer and add to wallet
  const claimId = 'TestClaimID123';
  const validFrom = new Date();
  const claim = testObj.issuer.createClaim(
    claimId,
    testData.existingSchema.name,
    testData.claimAttributes,
    testObj.account.getDID(),
    validFrom,
    new Date(),
  );
  testWallet.addClaim(claim);

  await testAccount.encrypt(testData.walletPassword);

  // export wallet to JSON
  const exportedWalletJSON = JSON.stringify(testWallet.export());

  // Create new wallet with exported JSON
  const importedWallet = new SeraphIDWallet(JSON.parse(exportedWalletJSON));

  // decrypt account and access getters of fields that will be compared
  await importedWallet.accounts[0].decrypt(testData.walletPassword);
  await testAccount.decrypt(testData.walletPassword);
  let _ = importedWallet.accounts[0].privateKey;
  _ = importedWallet.accounts[0].publicKey;
  _ = importedWallet.accounts[0].scriptHash;

  expect(importedWallet).toEqual(testWallet);
  const importedClaim = importedWallet.getClaim(claimId);

  expect(importedClaim).toBeDefined();
  if (importedClaim) {
    expect(importedClaim.validFrom).toEqual(validFrom);
  }
}, 10000);

test('Wallet.createDID', async () => {
  // create keys and wallet
  const testAccount = new SeraphIDAccount(testData.walletOwnerPrivateKey);
  const testWallet = new SeraphIDWallet({ name: testData.walletName });
  testWallet.addAccount(testAccount);
  expect(testWallet.getDID(0)).toEqual(testData.ownerDID);

  // create new random DID from wallet
  const did = testWallet.createDID();

  expect(testWallet.accounts.length).toEqual(2);
});

test('Account.encrypt.decrypt', async () => {
  const testObj = getTestData();
  // generate claim from issuer and add to wallet
  const claim = testObj.issuer.createClaim(
    'TestClaimID123',
    testData.existingSchema.name,
    testData.claimAttributes,
    testObj.account.getDID(),
    new Date(),
    new Date(),
  );
  testObj.wallet.addClaim(claim);
  const claimsBeforeEncryption = testObj.account.getAllClaims();

  await testObj.account.encrypt(testData.walletPassword);
  await testObj.account.decrypt(testData.walletPassword);
  expect(claimsBeforeEncryption).toEqual(testObj.account.getAllClaims());
}, 10000);