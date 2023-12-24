import { Injectable, Logger } from '@nestjs/common';

import { createClient } from '@supabase/supabase-js';
import { Transaction, formatEther, parseEther, parseUnits, zeroAddress } from 'viem';

import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { readFile, writeFile } from 'fs/promises';

import {
  Phunk,
  Sha,
  Event,
  PhunkResponse,
  ShaResponse,
  UserResponse,
  EventType,
  EventResponse,
  User,
  ListingResponse,
  Bid,
  BidResponse,
  Listing,
} from 'src/models/db';

import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE;

const supabase = createClient(supabaseUrl, serviceRole);

@Injectable()
export class SupabaseService {
  suffix = process.env.CHAIN_ID === '1' ? '' : '_goerli';

  async removeBid(hashId: string): Promise<void> {
    const response: ListingResponse = await supabase
      .from('bids' + this.suffix)
      .delete()
      .eq('hashId', hashId);
    const { error } = response;
    if (error) return Logger.error(error.details, error.message);
    Logger.log('Removed bid', hashId);
  }

  async createBid(
    txn: Transaction,
    createdAt: Date,
    hashId: string,
    fromAddress: string,
    value: bigint
  ): Promise<void> {
    const response: ListingResponse = await supabase
      .from('bids' + this.suffix)
      .upsert({
        createdAt,
        hashId,
        value: value.toString(),
        fromAddress: fromAddress.toLowerCase(),
        txHash: txn.hash.toLowerCase(),
      });

    const { error } = response;
    if (error) return Logger.error(error.details, error.message);
    Logger.log('Created bid', hashId);
  }

  async getBid(hashId: string): Promise<Bid> {
    const response: BidResponse = await supabase
      .from('bids' + this.suffix)
      .select('*')
      .eq('hashId', hashId);

    const { data, error } = response;

    if (error) throw error;
    if (data?.length) return data[0] as Bid;
    return null;
  }

  async getListing(hashId: string): Promise<Listing> {
    const response: ListingResponse = await supabase
      .from('listings' + this.suffix)
      .select('*')
      .eq('hashId', hashId);

    const { data, error } = response;

    if (error) throw error;
    if (data?.length) return data[0] as Listing;
    return null;
  }

  async createListing(
    txn: Transaction,
    createdAt: Date,
    hashId: string,
    toAddress: string,
    minValue: bigint
  ): Promise<void> {
    const response: ListingResponse = await supabase
      .from('listings' + this.suffix)
      .upsert({
        hashId,
        createdAt,
        txHash: txn.hash.toLowerCase(),
        listed: true,
        minValue: minValue.toString(),
        listedBy: txn.from.toLowerCase(),
        toAddress: toAddress.toLowerCase(),
      });

    const { error } = response;
    if (error) return Logger.error(error.details, error.message);
    Logger.log('Listing created', hashId);
  }

  async removeListing(hashId: string): Promise<void> {
    const response: ListingResponse = await supabase
      .from('listings' + this.suffix)
      .delete()
      .eq('hashId', hashId);
    const { error } = response;
    if (error) return Logger.error(error.details, error.message);
    Logger.log('Removed listing', hashId);
  }

  async updateListing() {}

  ////////////////////////////////////////////////////////////////////////////////
  // Checks //////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  async checkIsEthPhunks(sha: string): Promise<number | null> {
    const response: ShaResponse = await supabase
      .from('shas')
      .select('*')
      .eq('sha', sha);

    const { data, error } = response;

    if (error) throw error;
    if (data?.length) return data[0].id;
    return null;
  }

  async checkEthscriptionkExistsBySha(sha: string): Promise<boolean> {
    const response: PhunkResponse = await supabase
      .from('ethscriptions' + this.suffix)
      .select('*')
      .eq('sha', sha);

    const { data, error } = response;

    if (error) throw error;
    if (!data.length) return false;
    return true;
  }

  async checkEthPhunkExistsByHashId(hash: string): Promise<Phunk> {
    const response: PhunkResponse = await supabase
      .from('phunks' + this.suffix)
      .select('*')
      .eq('hashId', hash.toLowerCase());

    const { data, error } = response;

    if (error) throw error;
    if (data?.length) return data[0];
    return null;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Adds ////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  async addEthPhunk(
    txn: Transaction,
    createdAt: Date,
    phunkId: number,
    sha: string
  ): Promise<void> {
    const response: PhunkResponse = await supabase
      .from('phunks' + this.suffix)
      .insert([
        {
          createdAt,
          creator: txn.from.toLowerCase(),
          owner: txn.to.toLowerCase(),
          hashId: txn.hash.toLowerCase(),
          data: txn.input,
          sha,
          phunkId,
        },
      ]);

    const { error } = response;
    if (error) throw error.message;
  }

  async addEvent(
    txn: Transaction,
    from: string,
    to: string,
    hashId: string,
    phunkId: number,
    type: EventType,
    createdAt: Date,
    value: bigint,
    logIndex: number
  ): Promise<void> {
    const txId = `${txn.hash.toLowerCase()}-${logIndex}`;

    const response: PhunkResponse = await supabase
      .from('events' + this.suffix)
      .insert([
        {
          txId,
          blockTimestamp: createdAt,
          type,
          phunkId,
          value: value.toString(),
          hashId: hashId.toLowerCase(),
          from: from.toLowerCase(),
          to: (to || zeroAddress).toLowerCase(),
          blockNumber: Number(txn.blockNumber),
          blockHash: txn.blockHash.toLowerCase(),
          txIndex: Number(txn.transactionIndex),
          txHash: txn.hash.toLowerCase(),
        },
      ]);

    const { error } = response;
    console.log({error});
    if (error) Logger.error(error.message, txn.hash.toLowerCase());
    Logger.log('Event created', txn.hash.toLowerCase());
  }

  async addSha(phunkId: string, sha: string): Promise<Sha> {
    const response: ShaResponse = await supabase
      .from('shas' + this.suffix)
      .insert({ id: phunkId, sha, phunkId });

    const { data, error } = response;

    if (error) throw error;
    if (data?.length) return data[0];
  }

  async getOrCreateUser(address: string, createdAt?: Date): Promise<User> {
    address = address.toLowerCase();

    const response: UserResponse = await supabase
      .from('users' + this.suffix)
      .select('*')
      .eq('address', address);

    const { data, error } = response;

    if (error) throw error;
    if (data.length) return data[0];

    const newUserResponse: UserResponse = await supabase
      .from('users' + this.suffix)
      .insert({ address, createdAt: new Date() })
      .select();

    const { data: newUser, error: newError } = newUserResponse;

    if (newError) throw newError.message;
    Logger.log('User created', address);
    if (newUser?.length) return newUser[0];
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Updates /////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  async updateEthPhunkOwner(
    hashId: string,
    prevOwner: string,
    newOwner: string
  ): Promise<void> {
    const response: PhunkResponse = await supabase
      .from('phunks' + this.suffix)
      .update({
        owner: newOwner.toLowerCase(),
        prevOwner: prevOwner.toLowerCase(),
      })
      .eq('hashId', hashId);

    const { error } = response;
    if (error) throw error;
  }

  async updateEvent(eventId: number, data: any): Promise<void> {
    const response: EventResponse = await supabase
      .from('events' + this.suffix)
      .update(data)
      .eq('id', eventId);

    const { error } = response;
    if (error) throw error;
  }

  async updateUserPoints(address: string, points: number): Promise<void> {
    const response: UserResponse = await supabase
      .from('users' + this.suffix)
      .update({ points })
      .eq('address', address.toLowerCase());

    const { error } = response;
    if (error) throw error;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Auction House ///////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  async createAuction(
    args: {
      hashId: string,
      owner: string,
      auctionId: bigint,
      startTime: bigint,
      endTime: bigint
    },
    createdAt: Date
  ): Promise<void> {
    const { data, error } = await supabase
      .from('auctions' + this.suffix)
      .upsert({
        auctionId: Number(args.auctionId),
        createdAt,
        hashId: args.hashId.toLowerCase(),
        prevOwner: args.owner.toLowerCase(),
        amount: '0',
        startTime: new Date(Number(args.startTime) * 1000),
        endTime: new Date(Number(args.endTime) * 1000),
        bidder: zeroAddress.toLowerCase(),
        settled: false,
      });

    if (error) throw error;
    Logger.log('Auction created', args.hashId);

    return data;
  }

  async createAuctionBid(
    args: {
      hashId: string,
      auctionId: bigint,
      sender: string,
      value: bigint,
      extended: boolean
    },
    txn: Transaction,
    createdAt: Date
  ): Promise<void> {
    const { data: auctionsData, error: auctionsError } = await supabase
      .from('auctions' + this.suffix)
      .update({
        amount: args.value.toString(),
        bidder: args.sender.toLowerCase()
      })
      .eq('auctionId', Number(args.auctionId));

    if (auctionsData) throw auctionsError;

    const { data: bidsData, error: bidsError } = await supabase
      .from('auctionBids' + this.suffix)
      .insert({
        auctionId: Number(args.auctionId),
        createdAt: createdAt,
        fromAddress: args.sender.toLowerCase(),
        amount: args.value.toString(),
        txHash: txn.hash.toLowerCase(),
      });

    if (bidsData) throw bidsError;
    Logger.log(`Bid created`, args.hashId);
  }

  async settleAuction(
    args: {
      hashId: string,
      auctionId: bigint,
      winner: string,
      amount: bigint
    }
  ): Promise<void> {
    const { data, error } = await supabase
      .from('auctions' + this.suffix)
      .update({
        settled: true,
      })
      .eq('hashId', args.hashId.toLowerCase());

    if (error) throw error;
    Logger.log(`Auction settled`, args.hashId);
  }

  async extendAuction(
    args: {
      hashId: string,
      auctionId: bigint,
      endTime: bigint
    }
  ): Promise<void> {
    const { data, error } = await supabase
      .from('auctions' + this.suffix)
      .update({
        endTime: new Date(Number(args.endTime) * 1000),
      })
      .eq('auctionId', Number(args.auctionId));

    if (error) throw error;
    Logger.log(`Auction extended`, args.hashId);
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Gets ////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  async getPhunkById(phunkId: string): Promise<Phunk> {
    const response: PhunkResponse = await supabase
      .from('phunks' + this.suffix)
      .select('*')
      .eq('phunkId', phunkId);

    const { data, error } = response;

    if (error) throw error;
    if (data?.length) return data[0];
  }

  async getAllTransfers(): Promise<Event[]> {
    const response: EventResponse = await supabase
      .from('events' + this.suffix)
      .select('*')
      .eq('type', 'transfer');

    const { data, error } = response;

    if (error) throw error;
    if (data?.length) return data;
  }

  async getAllEthPhunks(): Promise<Phunk[]> {
    let allPhunks: any[] = [];
    const pageSize = 1000; // Max rows per request
    let hasMore = true;
    let page = 0;

    while (hasMore) {
      const { data, error } = await supabase
        .from('ethscriptions' + this.suffix)
        .select('*')
        .eq('collectionSlug', 'ethereum-phunks')
        .order('tokenId', { ascending: true })
        // .neq('prevOwner', null)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching data:', error);
        throw error;
      }

      if (data) {
        console.log('Fetched', data.length, 'phunks');
        allPhunks = allPhunks.concat(data);
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    return allPhunks;
  }

  async getUnminted(): Promise<void> {
    let allPhunks: any[] = [];
    const pageSize = 1000; // Max rows per request
    let hasMore = true;
    let page = 0;

    while (hasMore) {
      const { data, error } = await supabase
        .from('phunks_goerli')
        // .select('hashId')
        .select('phunkId')
        .order('phunkId', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching data:', error);
        throw error;
      }

      if (data) {
        allPhunks = allPhunks.concat(data);
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    const sorted = allPhunks.sort((a, b) => Number(a.phunkId) - Number(b.phunkId));
    let i = 0;
    let unminted = [];

    sorted.forEach((phunk) => {
        let currentId = Number(phunk.phunkId);
        while (i < currentId) {
            unminted.push(i);
            i++;
        }
        i = currentId + 1;
    });

    console.log(JSON.stringify(sorted));
    console.log(JSON.stringify(unminted));

    // const cleanPhunks = allPhunks.map((phunk) => phunk.hashId);

    // const tree = StandardMerkleTree.of(cleanPhunks, ["bytes32"]);
    // console.log('Merkle Root:', tree.root);

    // await writeFile('tree.json', JSON.stringify(cleanPhunks));
  }
}

// 0x6ab3099fa660b0d2ac925b50d5e96410f3c7571c75f0ef88e01a6b8fe9df1bef