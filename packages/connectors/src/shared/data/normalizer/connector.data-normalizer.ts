import type { ConnectorDataNormalizerMapping, IConnectorDataNormalizer } from "./connector.data-normalizer.interface";

export class ConnectorDataNormalizer<T, U>
  implements IConnectorDataNormalizer<T, U>
{
  private readonly mapping: ConnectorDataNormalizerMapping<T, U>;

  constructor(mapping: ConnectorDataNormalizerMapping<T, U>) {
    this.mapping = mapping;
  }

  public normalize(data: T): U {
    const result = {} as U;

    for (const destinationKey in this.mapping) {
      const mappingValue = this.mapping[destinationKey];
      let value: any;

      if (typeof mappingValue === "function") {
        value = mappingValue(data);
      } else {
        value = (data as any)[mappingValue];
      }

      if (value !== undefined) {
        (result as any)[destinationKey] = value;
      }
    }

    return result;
  }
}
