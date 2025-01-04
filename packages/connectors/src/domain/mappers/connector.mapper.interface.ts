export type ConnectorLevels = "external" | "domain" | "dataTarget";

export interface ConnectorMapperDefinition<ExternalEntity, DomainEntity, DataTargetEntity> {
  [key: string]: {
    [level in ConnectorLevels]: (entity: any) => any;
  };
}

export interface IConnectorMapper<ExternalEntity, DomainEntity, DataTargetEntity> {
  externalToDomain(external: ExternalEntity): DomainEntity;
  domainToDataTarget(domain: DomainEntity): DataTargetEntity;
  dataTargetToDomain(dataTarget: DataTargetEntity): DomainEntity;
}
