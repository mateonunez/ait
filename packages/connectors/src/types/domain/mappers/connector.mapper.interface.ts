export interface ExternalEntity {
  id: string;
  name: string;
  externalField: string;
}
export interface DomainEntity {
  id: string;
  name: string;
  domainField: string;
}
export interface DataTargetEntity {
  id: string;
  name: string;
  dataTargetField: string;
}

export type ConnectorLevels = "external" | "domain" | "dataTarget";

export type ConnectorMapperDefinition<ExternalEntity, DomainEntity, DataTargetEntity> = Partial<{
  [K in keyof DomainEntity]: {
    external: (external: ExternalEntity) => DomainEntity[K];
    domain: (domain: DomainEntity) => DomainEntity[K];
    dataTarget: (dataTarget: DataTargetEntity) => DomainEntity[K];
  };
}>;

export interface IConnectorMapper<ExternalEntity, DomainEntity, DataTargetEntity> {
  externalToDomain(external: ExternalEntity): DomainEntity;
  domainToDataTarget(domain: DomainEntity): DataTargetEntity;
  dataTargetToDomain(dataTarget: DataTargetEntity): DomainEntity;
}
