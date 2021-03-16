// Copyright (c) 2019 Swisscom Blockchain AG
// Licensed under MIT License
import { rpc, sc } from '@cityofzion/neon-js';
import { DIDNetwork, ISchema, IssuerOperation, SeraphIDError } from './common';
import { SeraphIDContractBase } from './contract-base';

/**
 * Direct communication interface with Seraph ID smart contract of the Issuer.
 */
export class SeraphIDIssuerContract extends SeraphIDContractBase {
  /**
   * Default constructor.
   * @param scriptHash Script hash of issuer's smart contract.
   * @param networkRpcUrl URL to NEO RPC.
   * @param network Network identifier used for DID
   */
  constructor(
    protected readonly scriptHash: string,
    protected readonly networkRpcUrl: string,
    protected readonly network: DIDNetwork,
    protected readonly magic: number,
  ) {
    super(networkRpcUrl, network, magic);
  }

  /**
   * Returns official name of the Issuer.
   * @returns Issuer's name.
   */
  public async getIssuerName(): Promise<string> {
    return this.getStringFromOperation(this.scriptHash, IssuerOperation.Name);
  }

  /**
   * Retruns DID of the issuer.
   * @returns Issuer's DID.
   */
  public getIssuerDID(): string {
    return `did:neoid:${this.network}:${this.scriptHash}`;
  }

  /**
   * Returns public key of the issuer required to validate claim's signature.
   * @returns Issuer's public key.
   */
  public async getIssuerPublicKeys(): Promise<string[]> {
    return this.getStringArrayFromOperation(this.scriptHash, IssuerOperation.GetPublicKeys);
  }

  /**
   * Initiate recovery list with signed message by certain public key
   * @param threshold minimum recoveries needed to perform an action
   * @param members recovery list
   * @param pubKeyIndex the index of public key used to sign message
   * @param message original message
   * @param signature signed message
   * @param issuerPrivateKey Private key of the issuer to sign the transaction.
   * @param gas Additional gas to be sent with invocation transaction.
   * @returns Transaction hash.
   */
  public async InitRecovery(threshold: number, members:string[], pubKeyIndex: number, message: string, signature: string, issuerPrivateKey: string, gas?: number): Promise<string> {
    const script = sc.createScript({
      scriptHash: this.scriptHash,
      operation: IssuerOperation.SetRecovery,
      args:
        [sc.ContractParam.integer(threshold),
        sc.ContractParam.array(...members.map(member => sc.ContractParam.byteArray(member))), 
        sc.ContractParam.integer(pubKeyIndex),
        sc.ContractParam.byteArray(message),
        sc.ContractParam.byteArray(signature)]
    });
    console.log(this.scriptHash);
    return this.sendSignedTransaction(script, issuerPrivateKey, gas);
  }
  
  /**
   * Initiate recovery list with signed message by certain public key
   * @param threshold minimum recoveries needed to perform an action
   * @param members recovery list
   * @param recoveryIndexes the index of public key used to sign message
   * @param message original message
   * @param signatures signed messages
   * @param issuerPrivateKey Private key of the issuer to sign the transaction.
   * @param gas Additional gas to be sent with invocation transaction.
   * @returns Transaction hash.
   */
  public async ResetRecovery(threshold: number, members:string[], recoveryIndexes: number[], message: string, signatures: string[], issuerPrivateKey: string, gas?: number): Promise<string> {
    const script = sc.createScript({
      scriptHash: this.scriptHash,
      operation: IssuerOperation.SetRecovery,
      args: 
        [sc.ContractParam.integer(threshold),
        sc.ContractParam.array(...members.map(member => sc.ContractParam.byteArray(member))), 
        sc.ContractParam.array(...recoveryIndexes.map(recoveryIndex => sc.ContractParam.integer(recoveryIndex))), 
        sc.ContractParam.byteArray(message),
        sc.ContractParam.array(...signatures.map(signature => sc.ContractParam.byteArray(signature)))],
    });
    return this.sendSignedTransaction(script, issuerPrivateKey, gas);
  }

  /**
   * Initiate recovery list with signed message by certain public key
   * @param addedPubKey newly added public key
   * @param recoveryIndexes the index of public key used to sign message
   * @param message original message
   * @param signatures signed messages
   * @param issuerPrivateKey Private key of the issuer to sign the transaction.
   * @param gas Additional gas to be sent with invocation transaction.
   * @returns Transaction hash.
   */
  public async AddKeyByRecovery(addedPubKey: string, recoveryIndexes: number[], message: string, signatures: string[], issuerPrivateKey: string, gas?: number): Promise<string> {
    const script =  sc.createScript({
      scriptHash: this.scriptHash,
      operation: IssuerOperation.AddKeyByRecovery,
      args: 
        [sc.ContractParam.byteArray(addedPubKey),
        sc.ContractParam.array(...recoveryIndexes.map(recoveryIndex => sc.ContractParam.integer(recoveryIndex))), 
        sc.ContractParam.byteArray(message),
        sc.ContractParam.array(...signatures.map(signature => sc.ContractParam.byteArray(signature)))],
    });
    return this.sendSignedTransaction(script, issuerPrivateKey, gas);
  }

  /**
   * Initiate recovery list with signed message by certain public key
   * @param removedPubKey removed public key
   * @param recoveryIndexes the index of public key used to sign message
   * @param message original message
   * @param signatures signed messages
   * @param issuerPrivateKey Private key of the issuer to sign the transaction.
   * @param gas Additional gas to be sent with invocation transaction.
   * @returns Transaction hash.
   */
  public async RemoveKeyByRecovery(removedPubKey: string, recoveryIndexes: number[], message: string, signatures: string[], issuerPrivateKey: string, gas?: number): Promise<string> {
    const sb = new sc.ScriptBuilder();
    const script = sc.createScript({
      scriptHash: this.scriptHash,
      operation: IssuerOperation.RemoveKeyByRecovery,
      args: [sc.ContractParam.byteArray(removedPubKey),
        sc.ContractParam.array(...recoveryIndexes.map(recoveryIndex => sc.ContractParam.integer(recoveryIndex))), 
        sc.ContractParam.byteArray(message),
        sc.ContractParam.array(...signatures.map(signature => sc.ContractParam.byteArray(signature)))],
    });
    return this.sendSignedTransaction(script, issuerPrivateKey, gas);
  }

  /**
   * Returns the schema for specified name.
   * @param schemaName Name of the schema.
   * @returns Detailed meta data structure of the given schema.
   */
  public async getSchemaDetails(schemaName: string): Promise<ISchema> {
    const paramSchemaName = sc.ContractParam.string(schemaName);
    const client = new rpc.RPCClient(this.networkRpcUrl);
    const res: any = await client.invokeFunction(
      this.scriptHash,
      IssuerOperation.GetSchemaDetails,
      [paramSchemaName],
    )
    const seraphResult = this.extractResult(res);
    if (!seraphResult.success) {
      throw new SeraphIDError(seraphResult.error, res);
    }

    const schema: ISchema = JSON.parse(rpc.StringParser(seraphResult.result));
    return schema;
  }

  /**
   * Checks if claim with the given ID is valid.
   * That is: if it was issued by this issuer and was not yet revoked.
   * Claim's optional validity dates (from-to) are not a part of this check.
   * @param claimId ID of the claim.
   * @returns True if claim is valid, false otherwise.
   */
  public async isValidClaim(claimId: string): Promise<boolean> {
    const paramClaimId = sc.ContractParam.string(claimId);
    const client = new rpc.RPCClient(this.networkRpcUrl);
    const res: any = await client.invokeFunction(
      this.scriptHash,
      IssuerOperation.IsValidClaim,
      [paramClaimId],
    );

    let result = false;
    if (res.stack != null && res.stack.length === 1) {
      result = res.stack[0].value;
    } else {
      const seraphResult = this.extractResult(res);
      if (!seraphResult.success) {
        throw new SeraphIDError(seraphResult.error, res);
      }

      result = rpc.IntegerParser(seraphResult.result) !== 0;
    }

    return result;
  }

  /**
   * Registers a new schema in Issuer's smart contract.
   * @param schema Schema to register.
   * @param issuerPrivateKey Private key of the issuer to sign the transaction.
   * @param gas Additional gas to be sent with invocation transaction.
   * @param intents Intents to be included in invocation transaction.
   * @returns Transaction hash.
   */
  public async registerSchema(
    schema: ISchema,
    issuerPrivateKey: string,
    gas?: number,
  ): Promise<string> {
    const paramName = sc.ContractParam.string(schema.name);
    const paramDefinition = sc.ContractParam.string(JSON.stringify(schema));

    return this.sendSignedTransaction(sc.createScript({
      scriptHash: this.scriptHash,
      operation: IssuerOperation.RegisterSchema,
      args: [paramName, paramDefinition]
    }), issuerPrivateKey, gas);
  }

  /**
   * Injects an issued claim of specified ID into Issuer's smart contract.
   * @param claimId ID of issued claim.
   * @param issuerPrivateKey Private key of the issuer to sign the transaction.
   * @param gas Additional gas to be sent with invocation transaction.
   * @param intents Intents to be included in invocation transaction.
   * @returns Transaction hash.
   */
  public async injectClaim(
    claimId: string,
    issuerPrivateKey: string,
    gas?: number,
  ): Promise<string> {
    const paramClaimId = sc.ContractParam.string(claimId);

    return this.sendSignedTransaction(sc.createScript({
      scriptHash: this.scriptHash,
      operation: IssuerOperation.InjectClaim,
      args: [paramClaimId]
    }), issuerPrivateKey, gas);
  }

  /**
   * Revokes previously issued claim of specified ID.
   * @param gas Id ID of issued claim.
   * @param issuerPrivateKey Private key of the issuer to sign the transaction.
   * @param gas Additional gas to be sent with invocation transaction.
   * @param intents Intents to be included in invocation transaction.
   * @returns Transaction hash.
   */
  public async revokeClaim(
    claimId: string,
    issuerPrivateKey: string,
    gas?: number,
  ): Promise<string> {
    const paramClaimId = sc.ContractParam.string(claimId);

    return this.sendSignedTransaction(sc.createScript({
      scriptHash: this.scriptHash,
      operation: IssuerOperation.RevokeClaim,
      args: [paramClaimId]
    }), issuerPrivateKey, gas);
  }

  /**
   * Invokes schema registration operation without sending a transaction.
   * @param schema The schema to be registered.
   */
  public async registerSchemaTest(schema: ISchema): Promise<void> {
    const paramName = sc.ContractParam.string(schema.name);
    const paramDefinition = sc.ContractParam.string(JSON.stringify(schema));
    const paramRevokable = sc.ContractParam.boolean(schema.revokable);
    const client = new rpc.RPCClient(this.networkRpcUrl);
    const res: any = await client.invokeFunction(
      this.scriptHash,
      IssuerOperation.RegisterSchema,
      [paramName,
      paramDefinition,
      paramRevokable]
    )
    
    const seraphResult = this.extractResult(res);

    if (!seraphResult.success) {
      throw new SeraphIDError(seraphResult.error, res);
    }
  }

  /**
   * Invokes claim injection operation without sending a transaction.
   * @param claimId ID of the issued claim.
   */
  public async injectClaimTest(claimId: string): Promise<void> {
    const paramClaimId = sc.ContractParam.string(claimId);
    const client = new rpc.RPCClient(this.networkRpcUrl);
    const res: any = await client.invokeFunction(this.scriptHash, IssuerOperation.InjectClaim, [paramClaimId]);
    const seraphResult = this.extractResult(res);

    if (!seraphResult.success) {
      throw new SeraphIDError(seraphResult.error, res);
    }
  }

  /**
   * Invokes claim revocation operation without sending a transaction.
   * @param claimId ID of the claim to be revoked.
   */
  public async revokeClaimTest(claimId: string): Promise<void> {
    const paramClaimId = sc.ContractParam.string(claimId);
    const client = new rpc.RPCClient(this.networkRpcUrl);
    const res: any = await client.invokeFunction(this.scriptHash, IssuerOperation.RevokeClaim, [paramClaimId]);
    const seraphResult = this.extractResult(res);

    if (!seraphResult.success) {
      throw new SeraphIDError(seraphResult.error, res);
    }
  }
}
