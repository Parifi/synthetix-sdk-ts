export class OracleDataRequiredError extends Error {
  oracleContract: string;
  oracleQuery: string;

  constructor(oracleContract: string, oracleQuery: string) {
    super(`OracleDataRequired: oracleContract=${oracleContract}, oracleQuery=${oracleQuery}`);
    this.oracleContract = oracleContract;
    this.oracleQuery = oracleQuery;
    this.name = 'OracleDataRequiredError';
  }
}
