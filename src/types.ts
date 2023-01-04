export interface BaseRecord {
  id: Readonly<string>;
  created: Readonly<string>;
  updated: Readonly<string>;
  collectionId: Readonly<string>;
  collectionName: Readonly<string>;
}

export interface AnyRecord extends BaseRecord {
  [key: string]: string;
}

export interface AuthRecord extends BaseRecord {
  email?: string;
  emailVisibility?: boolean;
  username?: string;
  verified?: boolean;
}

export interface AnyAuthRecord extends AuthRecord {
  [key: string]: string | boolean | undefined;
}

export type ReturnRecord<T extends BaseRecord = AnyRecord> = {
  [K in keyof T]: T[K] extends BaseRecord
    ? string
    : T[K] extends Array<BaseRecord>
    ? string[]
    : T[K];
} & Partial<{
  expand: {
    [K in keyof T as T[K] extends string ? any : K]?: T[K] extends string
      ? any
      : T[K];
  };
}>;

export type Sort<T extends BaseRecord = AnyRecord> = {
  [key in keyof Omit<T, "collectionId" | "collectionName">]?: "+" | "-";
};

export type Expand<T extends BaseRecord = AnyRecord> =
  | Array<string>
  | Array<
      keyof {
        [K in keyof T as T[K] extends BaseRecord | BaseRecord[]
          ? K
          : never]?: any;
      }
    >;

type PageQuery =
  | {
      page?: never;
      perPage?: never;
    }
  | {
      page: number;
      perPage: number;
    };

export type QueryParams<T extends BaseRecord = AnyRecord> = {
  sort?: Sort<T>;
  expand?: Expand<T>;
  filter?: string;
} & PageQuery;

export type CreateParams<T extends BaseRecord = AnyRecord> = {
  [K in keyof Omit<T, keyof BaseRecord>]: T[K] extends BaseRecord
    ? string
    : T[K] extends Array<BaseRecord>
    ? string[]
    : T[K];
} & { id?: string };

export type AuthCreateParams<T extends AuthRecord = AnyAuthRecord> = {
  [K in keyof Omit<T, keyof BaseRecord>]: T[K] extends BaseRecord
    ? string
    : T[K] extends Array<BaseRecord>
    ? string[]
    : T[K];
} & CreateParams<AuthRecord> & { password: string; passwordConfirm?: string };

export type UpdateParams<T extends AuthRecord = AnyAuthRecord> = Partial<{
  [K in keyof Omit<T, keyof BaseRecord>]: T[K] extends BaseRecord
    ? string
    : T[K] extends Array<BaseRecord>
    ? string[]
    : T[K];
}>;

type PasswordUpdateParams =
  | { password?: never; passwordConfirm?: never; oldPassword?: never }
  | { password: string; passwordConfirm: string; oldPassword: string };

export type AuthUpdateParams<T extends AuthRecord = AnyAuthRecord> = Partial<
  {
    [K in keyof Omit<T, keyof BaseRecord>]: T[K] extends BaseRecord
      ? string
      : T[K] extends Array<BaseRecord>
      ? string[]
      : T[K];
  } & Omit<CreateParams<AuthRecord>, "id">
> &
  PasswordUpdateParams;

export type ListReturn<T extends BaseRecord = AnyRecord> = {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: Array<ReturnRecord<T>>;
};

export interface AuthData<T extends AuthRecord = AnyRecord> {
  token: string;
  record: ReturnRecord<T>;
}

export interface RealtimeResponse<T extends AuthRecord = AnyRecord> {
  action: "create" | "delete" | "update";
  record: ReturnRecord<T>;
}
