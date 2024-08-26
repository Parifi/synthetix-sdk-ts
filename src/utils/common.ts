export const getPublicRpcEndpoint = (chainId: number) => {
  console.log(chainId);
  //   @todo Add chain specific logic for default public rpc endpoint
  return 'https://base.llamarpc.com';
};
