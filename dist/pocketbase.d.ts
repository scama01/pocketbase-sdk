interface BaseRecord {
    id: Readonly<string>;
    created: Readonly<string>;
    updated: Readonly<string>;
    collectionId: Readonly<string>;
    collectionName: Readonly<string>;
}
interface AnyRecord extends BaseRecord {
    [key: string]: string;
}
interface AuthRecord extends BaseRecord {
    email?: string;
    emailVisibility?: boolean;
    username?: string;
    verified?: boolean;
}
interface AnyAuthRecord extends AuthRecord {
    [key: string]: string | boolean | undefined;
}
type ReturnRecord<T extends BaseRecord = AnyRecord> = {
    [K in keyof T]: T[K] extends BaseRecord ? string : T[K] extends Array<BaseRecord> ? string[] : T[K];
} & Partial<{
    expand: {
        [K in keyof T as T[K] extends string ? any : K]?: T[K] extends string ? any : T[K];
    };
}>;
type Sort<T extends BaseRecord = AnyRecord> = {
    [key in keyof Omit<T, "collectionId" | "collectionName">]?: "+" | "-";
};
type Expand<T extends BaseRecord = AnyRecord> = Array<string> | Array<keyof {
    [K in keyof T as T[K] extends BaseRecord | BaseRecord[] ? K : never]?: any;
}>;
type PageQuery = {
    page?: never;
    perPage?: never;
} | {
    page: number;
    perPage: number;
};
type QueryParams<T extends BaseRecord = AnyRecord> = {
    sort?: Sort<T>;
    expand?: Expand<T>;
    filter?: string;
} & PageQuery;
type CreateParams<T extends BaseRecord = AnyRecord> = {
    [K in keyof Omit<T, keyof BaseRecord>]: T[K] extends BaseRecord ? string : T[K] extends Array<BaseRecord> ? string[] : T[K];
} & {
    id?: string;
};
type AuthCreateParams<T extends AuthRecord = AnyAuthRecord> = {
    [K in keyof Omit<T, keyof BaseRecord>]: T[K] extends BaseRecord ? string : T[K] extends Array<BaseRecord> ? string[] : T[K];
} & CreateParams<AuthRecord> & {
    password: string;
    passwordConfirm?: string;
};
type UpdateParams<T extends AuthRecord = AnyAuthRecord> = Partial<{
    [K in keyof Omit<T, keyof BaseRecord>]: T[K] extends BaseRecord ? string : T[K] extends Array<BaseRecord> ? string[] : T[K];
}>;
type PasswordUpdateParams = {
    password?: never;
    passwordConfirm?: never;
    oldPassword?: never;
} | {
    password: string;
    passwordConfirm: string;
    oldPassword: string;
};
type AuthUpdateParams<T extends AuthRecord = AnyAuthRecord> = Partial<{
    [K in keyof Omit<T, keyof BaseRecord>]: T[K] extends BaseRecord ? string : T[K] extends Array<BaseRecord> ? string[] : T[K];
} & Omit<CreateParams<AuthRecord>, "id">> & PasswordUpdateParams;
type ListReturn<T extends BaseRecord = AnyRecord> = {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
    items: Array<ReturnRecord<T>>;
};
interface AuthData<T extends AuthRecord = AnyRecord> {
    token: string;
    record: ReturnRecord<T>;
}
interface RealtimeResponse<T extends AuthRecord = AnyRecord> {
    action: "create" | "delete" | "update";
    record: ReturnRecord<T>;
}

interface SerializeOptions {
    encode?: (val: string | number | boolean) => string;
    maxAge?: number;
    domain?: string;
    path?: string;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    priority?: string;
    sameSite?: boolean | string;
}

declare class BaseAuth<T extends AuthRecord> {
    protected baseToken: string;
    protected baseRecord: T | null;
    private _onChangeCallbacks;
    get token(): string;
    get record(): T | null;
    /**
     * Check if the current user is still valid (based on the JWT token of the user).
     */
    get isValid(): boolean;
    save(token: string, record: T | null): void;
    clear(): void;
    /**
     * Load user from the provided cookie string.
     * @param cookie - The cookie string.
     * @param key - The cookie key.
     */
    loadFromCookie(cookie: string, key?: string): void;
    /**
     * Export the current user to a cookie.
     * @param options - Serializing options for the cookie
     * @param key - The cookie key.
     * @returns {string} The cookie string.
     */
    exportToCookie(options?: SerializeOptions, key?: string): string;
    /**
     * Subscribe to auth changes with a callback function.
     * @param callback - The callback function
     * @param fireImmediately - If the function should be called immediately
     * @returns A function you can use to unsubscribe from changes.
     */
    onChange(callback: (data: Partial<AuthData<T>>) => any, fireImmediately?: boolean): () => void;
    protected triggerChange(): void;
}

declare class Auth<T extends AuthRecord> extends BaseAuth<T> {
    private storageFallback;
    private storageKey;
    /**
     * New local auth instance.
     * @constructor
     */
    constructor(storageKey?: string);
    /**
     * JWT of the current logged in user (returns empty string if not logged in).
     * @readonly
     */
    get token(): string;
    /**
     * Record of the current logged user (returns null if not logged in).
     * @readonly
     */
    get record(): T | null;
    /**
     * Save new user in local storage.
     * @param token - JWT token of the user.
     * @param record - The user record.
     */
    save(token: string, record: T | null): void;
    /**
     * Clear the current user from local storage (or log out).
     */
    clear(): void;
    private _storageGet;
    private _storageSet;
    private _storageRemove;
}

/**
 * @class Collection
 * @typedef {Collection}
 * @template T extends BaseRecord
 */
declare class Collection<T extends BaseRecord> {
    protected readonly name: string;
    protected readonly client: Client<any>;
    protected readonly recordsUrl: string;
    /**
     * Instance of a collection from the database.
     * @constructor
     * @param {Client<any>} client - The PocketBase Client instance.
     * @param {string} name - The name of the collection.
     */
    constructor(client: Client<any>, name: string);
    /**
     * Get a paginated list with all the records from the collection.
     * @async
     * @param query - Query parameters for the request.
     * @returns List with all records from the collection.
     */
    getList(query?: QueryParams<T>): Promise<ListReturn<T>>;
    /**
     * Get a single record from the collection.
     * @async
     * @param id - ID of the record.
     * @param [expand] - Auto expand record relations.
     */
    get(id: string, expand?: Expand<T>): Promise<ReturnRecord<T>>;
    /**
     * Create a record in the collection.
     * @async
     * @param data - Data for the record in `JSON` or `FormData` format.
     * @param [expand] - Auto expand relations when returning the created record.
     * @returns The record created.
     */
    create(data: CreateParams<T> | FormData, expand?: Expand<T>): Promise<ReturnRecord<T>>;
    /**
     * Update a record in the collection.
     * @async
     * @param id - ID of the record you want to update.
     * @param data - Fields you want to update in `JSON` or `FormData` format.
     * @param expand - Auto expand relations when returning the updated record.
     * @returns The updated record.
     */
    update(id: string, data: UpdateParams<T> | FormData, expand?: Expand<T>): Promise<ReturnRecord<T>>;
    /**
     * Delete a record from the collection.
     * @async
     * @param id - ID of the record you want to delete.
     */
    delete(id: string): Promise<void>;
    /**
     * Subscribe to a topic.
     * @async
     * @param topic - The topic you want to subscribe to. (`*` for all records in the collection or the ID of the record you want to subscribe to)
     * @param callback - The callback function you want to be called when an event occurs.
     * @param keepAlive - If the realtime SSE instance should be kept alive after unsubscribing if there are no more callbacks existing. (default is `false`)
     * @returns An unsubscribe function.
     */
    subscribe(topic: string, callback: (data: RealtimeResponse<T>) => any, keepAlive?: boolean): Promise<() => Promise<void>>;
    /**
     * Unsubscribe from a topic/certain topics/all topics.
     * @async
     * @param topic - Topic(s) you want to unsubscribe from (`*` for all `*` subscriptions / `undefined` for all topics from the collection).
     * @param keepAlive - If the realtime SSE instance should be kept alive after unsubscribing if there are no more callbacks existing. (default is `false`)
     */
    unsubscribe(topic?: string, keepAlive?: boolean): Promise<void>;
}

declare class AuthCollection<T extends AuthRecord> extends Collection<T> {
    protected readonly url: string;
    /**
     * Instance of an auth collection from the database.
     * @constructor
     * @param {Client<any>} client - The PocketBase Client instance.
     * @param {string} name - The name of the collection.
     */
    constructor(client: Client<any>, name: string);
    /**
     * Create an user in the collection.
     * @async
     * @param data - The data for the user in `JSON` of `FormData` format.
     * @returns The user created.
     */
    create(data: AuthCreateParams<T> | FormData): Promise<ReturnRecord<T>>;
    update(id: string, data: FormData | AuthUpdateParams<T>, expand?: Expand<T>): Promise<ReturnRecord<T>>;
    /**
     * Authenticate using password.
     * @async
     * @param identity - The identity of the user (username or email).
     * @param password - The password of the user.
     * @returns The token and record of the user.
     */
    authWithPassword(identity: string, password: string): Promise<AuthData<T>>;
    /**
     * Refreshes the token and record of the current user.
     * @async
     * @returns The updated token and record of the user.
     */
    authRefresh(): Promise<AuthData<T>>;
}

declare class Realtime {
    private readonly client;
    private realtimeInstance;
    private clientID;
    private subscribedTopics;
    private subscribedCallbacks;
    constructor(client: Client<any>);
    private updateTopics;
    private removeTopic;
    private unsubscribeByTopicAndListener;
    /**
     * Initialize a realtime SSE connection.
     */
    initialize(): Promise<void>;
    /**
     * Disconnect from the realtime SSE connection (if exists).
     */
    disconnect(): void;
    /**
     * Subscribe to a database topic.
     * @param topic - The topic you want to subscribe to.
     * @param callback - The callback function you want to be called when an event occurs.
     * @param keepAlive - If the realtime SSE instance should be kept alive after unsubscribing if there are no more callbacks existing. (default is `false`)
     * @returns An unsubscribe function.
     */
    subscribe<T extends BaseRecord = AnyRecord>(topic: string, callback: (data: RealtimeResponse<T>) => any, keepAlive?: boolean): Promise<() => Promise<void>>;
    /**
     * Unsubscribe from a topic/certain topics/all topics.
     * @param topics - Topic(s) you want to unsubscribe from (empty string/undefined or `*` for all topics).
     * @param keepAlive - If the realtime SSE instance should be kept alive after unsubscribing if there are no more callbacks existing. (default is `false`)
     * @param matching - If the topic should be unsubscribed from if it begins with the name provided. (default is `false`)
     */
    unsubscribe(topics?: string | string[], keepAlive?: boolean, matching?: boolean): Promise<void>;
}

declare class Client<T extends AuthRecord> {
    /**
     * Base URL of the PocketBase instance.
     */
    readonly baseURL: string;
    /**
     * Base URL of the PocketBase API.
     */
    readonly apiURL: string;
    /**
     * Local auth instance for the PocketBase instance.
     */
    readonly auth: Auth<T>;
    /**
     * Realtime client instance.
     */
    readonly realtime: Realtime;
    /**
     * Create a new PocketBase client.
     * @constructor
     * @param {string} baseURL - Base URL of the PocketBase instance.
     * @template T extends AuthRecord - Type of the default user record.
     */
    constructor(baseURL: string);
    /**
     * Instance of a collection from the database.
     * @param {string} name - The name of the collection.
     * @template T extends BaseRecord - Type of the records inside the collection.
     */
    collection<T extends BaseRecord = AnyRecord>(name: string): Collection<T>;
    /**
     * Instance of an auth collection from the database.
     * @param {string} name - The name of the collection.
     * @template T extends AuthRecord - Type of the records inside the collection.
     */
    authCollection<T extends AuthRecord = AnyAuthRecord>(name: string): AuthCollection<T>;
}

export { AnyAuthRecord, AnyRecord, AuthCollection, AuthCreateParams, AuthData, AuthRecord, AuthUpdateParams, BaseRecord, Client, Collection, CreateParams, Expand, ListReturn, QueryParams, RealtimeResponse, ReturnRecord, Sort, UpdateParams };
