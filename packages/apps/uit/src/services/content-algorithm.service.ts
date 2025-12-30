import type { IntegrationEntity } from "@/types/integrations.types";

export interface IContentAlgorithmService {
  selectItems(entities: IntegrationEntity[], limit: number): IntegrationEntity[];
  shuffle<T>(array: T[]): T[];
}

export class ContentAlgorithmService implements IContentAlgorithmService {
  selectItems(entities: IntegrationEntity[], limit: number): IntegrationEntity[] {
    if (entities.length <= limit) {
      return entities;
    }

    const shuffled = this.shuffle([...entities]);
    return shuffled.slice(0, limit);
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

export const contentAlgorithmService = new ContentAlgorithmService();
