import type { ConversationSelect, MessageSelect } from "@ait/postgres";
import {
  type AddMessageOptions,
  type CreateConversationOptions,
  type UpdateConversationOptions,
  getConversationRepository,
} from "../repositories/conversation.repository";

export interface IConversationService {
  createConversation(options: CreateConversationOptions): Promise<ConversationSelect>;
  getConversation(id: string): Promise<ConversationSelect | null>;
  listConversations(userId?: string): Promise<ConversationSelect[]>;
  updateConversation(id: string, updates: UpdateConversationOptions): Promise<ConversationSelect | null>;
  deleteConversation(id: string): Promise<boolean>;
  addMessage(options: AddMessageOptions): Promise<MessageSelect>;
  getMessages(conversationId: string): Promise<MessageSelect[]>;
  getConversationWithMessages(
    id: string,
  ): Promise<{ conversation: ConversationSelect; messages: MessageSelect[] } | null>;
}

export class ConversationService implements IConversationService {
  private _repository = getConversationRepository();

  async createConversation(options: CreateConversationOptions = {}) {
    return this._repository.createConversation(options);
  }

  async getConversation(id: string) {
    return this._repository.getConversation(id);
  }

  async listConversations(userId?: string) {
    return this._repository.listConversations(userId);
  }

  async updateConversation(id: string, updates: UpdateConversationOptions) {
    return this._repository.updateConversation(id, updates);
  }

  async deleteConversation(id: string) {
    return this._repository.deleteConversation(id);
  }

  async addMessage(options: AddMessageOptions) {
    return this._repository.addMessage(options);
  }

  async getMessages(conversationId: string) {
    return this._repository.getMessages(conversationId);
  }

  async getConversationWithMessages(id: string) {
    return this._repository.getConversationWithMessages(id);
  }
}

let instance: ConversationService | null = null;

export function getConversationService(): ConversationService {
  if (!instance) {
    instance = new ConversationService();
  }
  return instance;
}
