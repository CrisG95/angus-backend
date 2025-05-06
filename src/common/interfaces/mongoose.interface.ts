import { ClientSession, PopulateOptions, SortOrder } from 'mongoose';

export interface FindOptions {
  session?: ClientSession;
  lean?: boolean;
  populate?: string | PopulateOptions | (string | PopulateOptions)[];
  sort?: { [key: string]: SortOrder };
  skip?: number;
  limit?: number;
  projection?: any;
}

export interface UpdateOptions {
  session?: ClientSession;
  lean?: boolean;
  populate?: PopulateOptions | PopulateOptions[];
  projection?: any;
  returnNew?: boolean;
  upsert?: boolean;
}
