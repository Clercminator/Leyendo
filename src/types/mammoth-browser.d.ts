declare module "mammoth/mammoth.browser" {
  interface RawTextResult {
    value: string;
    messages: unknown[];
  }

  interface MammothBrowserApi {
    extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<RawTextResult>;
  }

  const mammoth: MammothBrowserApi;

  export default mammoth;
}
