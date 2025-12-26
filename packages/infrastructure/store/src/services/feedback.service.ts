import type { FeedbackStats, ListFeedbackOptions, QualityTrendPoint } from "@ait/core";
import type { FeedbackInsert, FeedbackSelect } from "@ait/postgres";
import { type IFeedbackRepository, getFeedbackRepository } from "../repositories/feedback.repository";

export class FeedbackService {
  private _repository: IFeedbackRepository;

  constructor(repository?: IFeedbackRepository) {
    this._repository = repository || getFeedbackRepository();
  }

  async recordFeedback(data: FeedbackInsert): Promise<FeedbackSelect> {
    return this._repository.recordFeedback(data);
  }

  async getFeedbackStats(windowMs?: number): Promise<FeedbackStats> {
    return this._repository.getFeedbackStats(windowMs);
  }

  async getQualityTrend(bucketSizeMs?: number, windowMs?: number): Promise<QualityTrendPoint[]> {
    return this._repository.getQualityTrend(bucketSizeMs, windowMs);
  }

  async getAllFeedback(options?: ListFeedbackOptions): Promise<FeedbackSelect[]> {
    return this._repository.listFeedback(options);
  }

  async getProblematicTraces(limit?: number, windowMs?: number): Promise<FeedbackSelect[]> {
    return this._repository.getProblematicTraces(limit, windowMs);
  }

  async isQualityDegrading(): Promise<boolean> {
    return this._repository.isQualityDegrading();
  }
}

let instance: FeedbackService | null = null;

export function getFeedbackService(): FeedbackService {
  if (!instance) {
    instance = new FeedbackService();
  }
  return instance;
}
