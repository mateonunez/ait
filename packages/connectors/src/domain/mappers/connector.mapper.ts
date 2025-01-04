import type { ConnectorLevels, ConnectorMapperDefinition, IConnectorMapper } from "./connector.mapper.interface";

export class ConnectorMapper<ExternalEntity, DomainEntity, DataTargetEntity>
  implements IConnectorMapper<ExternalEntity, DomainEntity, DataTargetEntity>
{
  private config: ConnectorMapperDefinition<ExternalEntity, DomainEntity, DataTargetEntity>;
  private domainDefaults: Partial<DomainEntity>;

  constructor(
    config: ConnectorMapperDefinition<ExternalEntity, DomainEntity, DataTargetEntity>,
    domainDefaults: Partial<DomainEntity> = {},
  ) {
    this.config = config;
    this.domainDefaults = domainDefaults;
  }

  public externalToDomain(external: ExternalEntity): DomainEntity {
    return this._mapEntity(external, "external", this.domainDefaults);
  }

  public domainToDataTarget(domain: DomainEntity): DataTargetEntity {
    return this._mapEntity(domain, "domain");
  }

  public dataTargetToDomain(dataTarget: DataTargetEntity): DomainEntity {
    return this._mapEntity(dataTarget, "dataTarget", this.domainDefaults);
  }

  private _mapEntity<Source, Target>(source: Source, level: ConnectorLevels, defaults: Partial<Target> = {}): Target {
    const target: Partial<Target> = {};

    for (const field in this.config) {
      const configField = this.config[field];
      if (configField) {
        const mapFn = configField[level];
        const mappedValue = mapFn(source);

        if (level === "domain" && typeof configField.dataTarget === "function") {
          const targetField = this._getTargetFieldName(field, configField);
          target[targetField as keyof Target] = mappedValue as Target[keyof Target];
        } else {
          target[field as keyof Target] = mappedValue as Target[keyof Target];
        }
      }
    }

    for (const field in defaults) {
      if (target[field as keyof Target] === undefined) {
        target[field as keyof Target] = defaults[field];
      }
    }

    return target as Target;
  }

  private _getTargetFieldName(sourceField: string, configField: any): string {
    if (sourceField === "domainField" && configField.dataTarget) {
      return "dataTargetField";
    }
    return sourceField;
  }
}
