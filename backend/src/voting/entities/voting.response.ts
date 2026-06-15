import { PollCategory, PollPeriod, PollStatus } from '@prisma/client';

export interface PollCreatorResponse {
  id: number;
  email: string;
  display_name: string | null;
}

export interface NomineeResponse {
  id: number;
  item_type: PollCategory;
  item_id: number;
  item_name: string;
  item_image: string | null;
  created_at: Date;
  votes_count: number;
}

export interface PollResponse {
  id: number;
  title: string;
  category: PollCategory;
  period: PollPeriod;
  status: PollStatus;
  starts_at: Date;
  ends_at: Date;
  created_at: Date;
  updated_at: Date;
  creator: PollCreatorResponse;
  nominees: NomineeResponse[];
}

export interface PollVoteResponse {
  id: number;
  poll_id: number;
  nominee_id: number;
  user_id: number;
  created_at: Date;
  poll: {
    id: number;
    title: string;
    category: PollCategory;
    period: PollPeriod;
    status: PollStatus;
  };
  nominee: NomineeResponse;
}

export interface MonthlyVoteResponse {
  id: number;
  user_id: number;
  item_type: PollCategory;
  item_id: number;
  period: string;
  created_at: Date;
}

export interface MonthlyTopItemResponse {
  item_type: PollCategory;
  item_id: number;
  period: string;
  count: number;
  item_name: string;
  item_image: string | null;
}

export interface CountResponse {
  count: number;
}
