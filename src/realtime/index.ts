import axios from "axios";
import { EventSourcePolyfill, NativeEventSource } from "event-source-polyfill";
import * as path from "path-browserify";
import Client from "../client";
import { AnyRecord, BaseRecord, RealtimeResponse } from "../types";
import { RequestError } from "../utils";

const EventSource = NativeEventSource || EventSourcePolyfill;

export default class Realtime {
  private readonly client: Client<any>;
  private realtimeInstance: EventSource | undefined;
  private clientID: string | undefined;
  private subscribedTopics: string[];
  private subscribedCallbacks: {
    topic: string;
    callback: (data: MessageEvent) => any;
  }[];

  constructor(client: Client<any>) {
    this.client = client;
    this.subscribedTopics = [];
    this.subscribedCallbacks = [];
  }

  private async updateTopics() {
    await axios({
      url: new URL(path.join(this.client.apiURL, "realtime")).toString(),
      method: "POST",
      data: {
        clientId: this.clientID,
        subscriptions: this.subscribedTopics,
      },
      headers: {
        Authorization: this.client.auth.token,
      },
    }).catch((err) => {
      throw new RequestError(err);
    });
  }

  private async removeTopic(topic: string, matching = false) {
    this.subscribedTopics = this.subscribedTopics.filter((value) => {
      if (matching) {
        return !new RegExp(`^${topic}/?([a-zA-Z0-9_-]+)?`, "g").test(value);
      } else {
        return value !== topic;
      }
    });
    this.subscribedCallbacks
      .filter((value) => {
        if (matching) {
          return new RegExp(`^${topic}/?([a-zA-Z0-9_-]+)?`, "g").test(
            value.topic
          );
        } else {
          return value.topic === topic;
        }
      })
      .forEach((listener) => {
        this.realtimeInstance?.removeEventListener(
          listener.topic,
          listener.callback
        );
      });
    this.subscribedCallbacks = this.subscribedCallbacks.filter((value) => {
      if (matching) {
        return !new RegExp(`^${topic}/?([a-zA-Z0-9_-]+)?`, "g").test(
          value.topic
        );
      } else {
        return value.topic !== topic;
      }
    });
  }

  private async unsubscribeByTopicAndListener(
    topic: string,
    listener: (data: any) => any,
    keepAlive = false
  ) {
    this.realtimeInstance?.removeEventListener(topic, listener);

    this.subscribedCallbacks = this.subscribedCallbacks.filter((value) => {
      return value.callback !== listener;
    });

    if (
      this.subscribedCallbacks.filter((value) => {
        value.topic === topic;
      }).length === 0
    ) {
      this.subscribedTopics = this.subscribedTopics.filter(
        (value) => value !== topic
      );
    }

    if (this.subscribedCallbacks.length === 0 && !keepAlive) this.disconnect();
  }

  /**
   * Initialize a realtime SSE connection.
   */
  async initialize() {
    await new Promise<void>((resolve) => {
      this.realtimeInstance = new EventSource(
        new URL(path.join(this.client.apiURL, "realtime")).toString()
      );

      this.realtimeInstance.addEventListener("PB_CONNECT", async (data) => {
        this.clientID = JSON.parse(data.data).clientId;
        await this.updateTopics();
        resolve();
      });
    });
  }

  /**
   * Disconnect from the realtime SSE connection (if exists).
   */
  disconnect() {
    this.realtimeInstance?.close();
    this.realtimeInstance = undefined;
    this.clientID = undefined;
    this.subscribedCallbacks = [];
    this.subscribedTopics = [];
  }

  /**
   * Subscribe to a database topic.
   * @param topic - The topic you want to subscribe to.
   * @param callback - The callback function you want to be called when an event occurs.
   * @param keepAlive - If the realtime SSE instance should be kept alive after unsubscribing if there are no more callbacks existing. (default is `false`)
   * @returns An unsubscribe function.
   */
  async subscribe<T extends BaseRecord = AnyRecord>(
    topic: string,
    callback: (data: RealtimeResponse<T>) => any,
    keepAlive = false
  ) {
    if (!this.realtimeInstance) {
      await this.initialize();
    }

    if (!this.subscribedTopics.includes(topic)) {
      this.subscribedTopics.push(topic);
    }

    await this.updateTopics();

    const listener = (data: MessageEvent) => {
      callback(JSON.parse(data.data));
    };

    this.subscribedCallbacks.push({
      topic,
      callback: listener,
    });

    this.realtimeInstance?.addEventListener(topic, listener);

    return async () => {
      await this.unsubscribeByTopicAndListener(topic, listener, keepAlive);
    };
  }

  /**
   * Unsubscribe from a topic/certain topics/all topics.
   * @param topics - Topic(s) you want to unsubscribe from (empty string/undefined or `*` for all topics).
   * @param keepAlive - If the realtime SSE instance should be kept alive after unsubscribing if there are no more callbacks existing. (default is `false`)
   * @param matching - If the topic should be unsubscribed from if it begins with the name provided. (default is `false`)
   */
  async unsubscribe(
    topics?: string | string[],
    keepAlive = false,
    matching = false
  ) {
    if (typeof topics === "undefined" || topics === "" || topics === "*") {
      this.subscribedCallbacks = [];
      this.subscribedTopics = [];
    } else if (typeof topics === "string") {
      await this.removeTopic(topics, matching);
    } else if (Array.isArray(topics)) {
      for (let topic in topics) {
        await this.removeTopic(topic, matching);
      }
    }

    await this.updateTopics();

    if (this.subscribedCallbacks.length === 0 && !keepAlive) this.disconnect();
  }
}
