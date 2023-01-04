import axios from "axios";
import * as path from "path-browserify";
import Client from "../client";
import {
  BaseRecord,
  CreateParams,
  Expand,
  ListReturn,
  QueryParams,
  RealtimeResponse,
  ReturnRecord,
  UpdateParams,
} from "../types";
import { RequestError } from "../utils";
import { setQuery } from "./utils";

/**
 * @class Collection
 * @typedef {Collection}
 * @template T extends BaseRecord
 */
export default class Collection<T extends BaseRecord> {
  protected readonly name: string;
  protected readonly client: Client<any>;
  protected readonly recordsUrl: string;

  /**
   * Instance of a collection from the database.
   * @constructor
   * @param {Client<any>} client - The PocketBase Client instance.
   * @param {string} name - The name of the collection.
   */
  constructor(client: Client<any>, name: string) {
    if (name.trim() === "") throw new Error("Name cannot be an empty string.");
    this.name = name;
    this.client = client;
    this.recordsUrl = path.join(
      client.apiURL,
      "/collections",
      name,
      "/records"
    );
  }

  /**
   * Get a paginated list with all the records from the collection.
   * @async
   * @param query - Query parameters for the request.
   * @returns List with all records from the collection.
   */
  async getList(query?: QueryParams<T>) {
    const apiURL = new URL(this.recordsUrl);
    setQuery(query, apiURL.searchParams);
    const res = await axios({
      url: apiURL.toString(),
      headers: {
        Authorization: this.client.auth.token,
      },
    }).catch((err) => {
      throw new RequestError(err);
    });
    const data = await res.data;
    return data as ListReturn<T>;
  }

  /**
   * Get a single record from the collection.
   * @async
   * @param id - ID of the record.
   * @param [expand] - Auto expand record relations.
   */
  async get(id: string, expand?: Expand<T>) {
    const apiURL = new URL(path.join(this.recordsUrl, id));
    setQuery({ expand }, apiURL.searchParams);
    const res = await axios({
      url: apiURL.toString(),
      headers: {
        Authorization: this.client.auth.token,
      },
    }).catch((err) => {
      throw new RequestError(err);
    });
    const data = await res.data;
    return data as ReturnRecord<T>;
  }

  /**
   * Create a record in the collection.
   * @async
   * @param data - Data for the record in `JSON` or `FormData` format.
   * @param [expand] - Auto expand relations when returning the created record.
   * @returns The record created.
   */
  async create(data: CreateParams<T> | FormData, expand?: Expand<T>) {
    const apiURL = new URL(this.recordsUrl);
    setQuery({ expand }, apiURL.searchParams);
    const res = await axios({
      url: apiURL.toString(),
      method: "POST",
      data: data,
      headers: {
        "Content-Type":
          data instanceof FormData ? "multipart/form-data" : "application/json",
        Authorization: this.client.auth.token,
      },
    }).catch((err) => {
      throw new RequestError(err);
    });
    return res.data as ReturnRecord<T>;
  }

  /**
   * Update a record in the collection.
   * @async
   * @param id - ID of the record you want to update.
   * @param data - Fields you want to update in `JSON` or `FormData` format.
   * @param expand - Auto expand relations when returning the updated record.
   * @returns The updated record.
   */
  async update(
    id: string,
    data: UpdateParams<T> | FormData,
    expand?: Expand<T>
  ) {
    const apiURL = new URL(path.join(this.recordsUrl, id));
    setQuery({ expand }, apiURL.searchParams);
    const res = await axios({
      url: apiURL.toString(),
      method: "PATCH",
      data: data,
      headers: {
        "Content-Type":
          data instanceof FormData ? "multipart/form-data" : "application/json",
        Authorization: this.client.auth.token,
      },
    }).catch((err) => {
      throw new RequestError(err);
    });
    return res.data as ReturnRecord<T>;
  }

  /**
   * Delete a record from the collection.
   * @async
   * @param id - ID of the record you want to delete.
   */
  async delete(id: string) {
    await axios({
      url: new URL(path.join(this.recordsUrl, id)).toString(),
      method: "DELETE",
      headers: {
        Authorization: this.client.auth.token,
      },
    }).catch((err) => {
      throw new RequestError(err);
    });
  }

  /**
   * Subscribe to a topic.
   * @async
   * @param topic - The topic you want to subscribe to. (`*` for all records in the collection or the ID of the record you want to subscribe to)
   * @param callback - The callback function you want to be called when an event occurs.
   * @param keepAlive - If the realtime SSE instance should be kept alive after unsubscribing if there are no more callbacks existing. (default is `false`)
   * @returns An unsubscribe function.
   */
  async subscribe(
    topic: string,
    callback: (data: RealtimeResponse<T>) => any,
    keepAlive = false
  ) {
    if (topic === "*") {
      return await this.client.realtime.subscribe(
        this.name,
        callback,
        keepAlive
      );
    } else {
      return await this.client.realtime.subscribe(
        path.join(this.name, topic),
        callback,
        keepAlive
      );
    }
  }

  /**
   * Unsubscribe from a topic/certain topics/all topics.
   * @async
   * @param topic - Topic(s) you want to unsubscribe from (`*` for all `*` subscriptions / `undefined` for all topics from the collection).
   * @param keepAlive - If the realtime SSE instance should be kept alive after unsubscribing if there are no more callbacks existing. (default is `false`)
   */
  async unsubscribe(topic?: string, keepAlive = false) {
    if (typeof topic === "string") {
      if (topic === "*") {
        return await this.client.realtime.unsubscribe(this.name, keepAlive);
      } else {
        return await this.client.realtime.unsubscribe(
          path.join(this.name, topic),
          keepAlive
        );
      }
    } else if (typeof topic === "undefined") {
      return await this.client.realtime.unsubscribe(this.name, keepAlive, true);
    }
  }
}
