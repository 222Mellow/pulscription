import { PostgrestError } from '@supabase/supabase-js';

export interface EthscriptionResponse {
  data: Ethscription[];
  error: PostgrestError | null;
}

export interface EventResponse {
  data: Event[];
  error: PostgrestError | null;
}

export interface AttributesResponse {
  data: AttributeItem[];
  error: PostgrestError | null;
}

export interface UserResponse {
  data: User[];
  error: PostgrestError | null;
}

export interface ListingResponse {
  data: Listing[];
  error: PostgrestError | null;
}

export interface BidResponse {
  data: Bid[];
  error: PostgrestError | null;
}

export interface Listing {
  hashId: string
  createdAt: Date
  listed: boolean
  toAddress: string | null
  listedBy: string
  txHash: string
  minValue: number
}

export interface Bid {
  hashId: string
  txHash: string
  createdAt: Date;
  value: string;
  fromAddress: string;
}

export interface Ethscription {
  hashId: string;
  createdAt: Date | null;
  creator: string | null;
  owner: string | null;
  sha: string;
  tokenId: number | null;
  prevOwner: string;
  slug: string | null;
  locked: boolean;
}

export interface Collection {
  name: string;
  singleName: string;
  id: number;
}

export interface Event {
  txId: string;
  type: EventType;
  hashId: string | null;
  from: string | null;
  to: string | null;
  blockHash: string | null;
  txIndex: number | null;
  txHash: string;
  blockNumber: number | null;
  blockTimestamp: Date | null;
  value: string | null;
  l2?: boolean;
}

export interface AttributeItem {
  sha: string;
  values: {k: string, v: string}[];
  slug: string;
  tokenId: number | null;
}

export interface User {
  createdAt: Date;
  address: string;
}

export type EventType = 'transfer' | 'sale' | 'created' | 'burned' | 'PhunkOffered' | 'PhunkBidEntered' | 'PhunkBought' | 'PhunkBidWithdrawn' | 'PhunkDeposited' | 'PhunkWithdrawn' | 'PhunkNoLongerForSale';
