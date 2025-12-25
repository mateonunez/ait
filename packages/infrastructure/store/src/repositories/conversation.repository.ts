import { getLogger } from "@ait/core";
import type { MessageRole } from "@ait/core";
import type { ConversationSelect, MessageSelect } from "@ait/postgres";
import { conversations, drizzleOrm, getPostgresClient, messages } from "@ait/postgres";

const logger = getLogger();
const pgClient = getPostgresClient();

export interface CreateConversationOptions {
  title?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface AddMessageOptions {
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
  traceId?: string;
}

export interface UpdateConversationOptions {
  title?: string;
  metadata?: Record<string, any>;
}

export interface IConversationRepository {
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

export class ConversationRepository implements IConversationRepository {
  async createConversation(options: CreateConversationOptions = {}): Promise<ConversationSelect> {
    const { title, userId, metadata } = options;

    const [conversation] = await pgClient.db
      .insert(conversations)
      .values({
        title: title || null,
        userId: userId || null,
        metadata: metadata || null,
      })
      .returning();

    logger.info(`[ConversationRepository] Created conversation: ${conversation!.id}`);
    return conversation!;
  }

  async getConversation(id: string): Promise<ConversationSelect | null> {
    const [conversation] = await pgClient.db
      .select()
      .from(conversations)
      .where(drizzleOrm.eq(conversations.id, id))
      .limit(1);

    return conversation || null;
  }

  async listConversations(userId?: string): Promise<ConversationSelect[]> {
    let query = pgClient.db.select().from(conversations);

    if (userId) {
      query = query.where(drizzleOrm.eq(conversations.userId, userId)) as any;
    }

    const results = await query.orderBy(drizzleOrm.desc(conversations.updatedAt)).execute();
    return results;
  }

  async updateConversation(id: string, updates: UpdateConversationOptions): Promise<ConversationSelect | null> {
    const [updated] = await pgClient.db
      .update(conversations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(drizzleOrm.eq(conversations.id, id))
      .returning();

    if (updated) {
      logger.info(`[ConversationRepository] Updated conversation: ${id}`);
    }

    return updated || null;
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await pgClient.db.delete(conversations).where(drizzleOrm.eq(conversations.id, id)).execute();

    logger.info(`[ConversationRepository] Deleted conversation: ${id}`);
    return result.count > 0;
  }

  async addMessage(options: AddMessageOptions): Promise<MessageSelect> {
    const { conversationId, role, content, metadata, traceId } = options;

    const [message] = await pgClient.db
      .insert(messages)
      .values({
        conversationId,
        role,
        content,
        metadata: metadata || null,
        traceId: traceId || null,
      })
      .returning();

    await pgClient.db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(drizzleOrm.eq(conversations.id, conversationId))
      .execute();

    logger.debug(`[ConversationRepository] Added message to conversation: ${conversationId}`);
    return message!;
  }

  async getMessages(conversationId: string): Promise<MessageSelect[]> {
    const results = await pgClient.db
      .select()
      .from(messages)
      .where(drizzleOrm.eq(messages.conversationId, conversationId))
      .orderBy(drizzleOrm.asc(messages.createdAt))
      .execute();

    return results;
  }

  async getConversationWithMessages(
    id: string,
  ): Promise<{ conversation: ConversationSelect; messages: MessageSelect[] } | null> {
    const conversation = await this.getConversation(id);
    if (!conversation) {
      return null;
    }

    const conversationMessages = await this.getMessages(id);

    return {
      conversation,
      messages: conversationMessages,
    };
  }
}

let instance: ConversationRepository | null = null;

export function getConversationRepository(): ConversationRepository {
  if (!instance) {
    instance = new ConversationRepository();
  }
  return instance;
}
