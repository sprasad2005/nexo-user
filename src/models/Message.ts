import { MessageType } from "@/types/nexo";

export interface MessageDocument {
  _id?: any;
  id: string;
  seq?: number;
  conversationId: string;
  senderId: string;
  text: string;
  type: MessageType;
  attachment?: any;
  reactions?: any[];
  replyToMessageId?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  isEdited?: boolean;
  isDeleted?: boolean;
  isDeletedByAdmin?: boolean;
  deletedByUserId?: string;
}

