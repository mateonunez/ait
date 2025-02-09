import type { XTweetDataTarget } from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

export class ETLXTweetDescriptor implements IETLEmbeddingDescriptor<XTweetDataTarget> {
  public getEmbeddingText(tweet: XTweetDataTarget): string {
    return JSON.stringify(tweet, null, 2).replace(/{/g, "{{").replace(/}/g, "}}");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: XTweetDataTarget): U {
    return {
      __type: "tweet",
      ...entity,
    } as unknown as U;
  }
}

export const xDescriptorsETL = {
  tweet: new ETLXTweetDescriptor(),
};
