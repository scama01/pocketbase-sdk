import * as path from "path";
import Auth from "../auth";
import Collection from "../collection";
import AuthCollection from "../collection/auth";
import Realtime from "../realtime";
import { AnyAuthRecord, AnyRecord, AuthRecord, BaseRecord } from "../types";

export default class Client<T extends AuthRecord> {
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
  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.apiURL = path.join(baseURL, "api");
    this.auth = new Auth<T>();
    this.realtime = new Realtime(this);
  }

  /**
   * Instance of a collection from the database.
   * @param {string} name - The name of the collection.
   * @template T extends BaseRecord - Type of the records inside the collection.
   */
  collection<T extends BaseRecord = AnyRecord>(name: string) {
    return new Collection<T>(this, name);
  }

  /**
   * Instance of an auth collection from the database.
   * @param {string} name - The name of the collection.
   * @template T extends AuthRecord - Type of the records inside the collection.
   */
  authCollection<T extends AuthRecord = AnyAuthRecord>(name: string) {
    return new AuthCollection<T>(this, name);
  }
}
