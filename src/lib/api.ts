import * as Bluebird from "bluebird";
import {EventEmitter} from "events";
import {CookieJar} from "request";

import getContacts from "./api/get-contacts";
import sendMessage from "./api/send-message";
import * as api from "./interfaces/api";
import {ApiContext} from "./interfaces/api-context";
import {IO} from "./interfaces/io";
import {MessagesPoller} from "./polling/messages-poller";

export class Api extends EventEmitter implements ApiEvents {
  io: IO;
  apiContext: ApiContext;
  messagesPoller: MessagesPoller;

  constructor (context: ApiContext, io: IO) {
    super();
    this.apiContext = context;
    this.io = io;
    this.messagesPoller = new MessagesPoller(this.io, this.apiContext);
    this.messagesPoller.on("error", (err: Error) => this.emit("error", err));
    this.messagesPoller.on("event-message", (ev: api.EventMessage) => this.handlePollingEvent(ev));
  }

  getContacts(): Bluebird<api.Contact[]> {
    return getContacts(this.io, this.apiContext);
  }

  sendMessage (message: api.NewMessage, conversationId: string): Bluebird<any> {
    return sendMessage(this.io, this.apiContext, message, conversationId);
  }

  /**
   * Start polling and emitting events
   */
  listen (): Bluebird<this> {
    this.messagesPoller.run();
    return Bluebird.resolve(this);
  }

  /**
   * Stop polling and emitting events
   */
  stopListening (): Bluebird<this> {
    this.messagesPoller.stop();
    return Bluebird.resolve(this);
  }

  protected handlePollingEvent(ev: api.EventMessage): any {
    this.emit("event", ev);

    if (ev && ev.resource && ev.resource.type === "Text") {
      this.emit("Text", ev.resource);
    } else if (ev && ev.resource && ev.resource.type === "RichText") {
      this.emit("RichText", ev.resource);
    }
  }
}

export interface ApiEvents extends NodeJS.EventEmitter {

}

export default Api;