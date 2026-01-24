import { ConnectRouter } from '@connectrpc/connect';
import { isString } from '@nestjs/common/utils/shared.utils';
import {
  CustomTransportStrategy,
  MessageHandler,
  Server,
} from '@nestjs/microservices';
import { ServerTypeOptions } from './nestjs-bufconnect.interface';
import { CustomMetadataStore } from './nestjs-bufconnect.provider';
import { HTTPServer } from './server';
import { addServicesToRouter, createServiceHandlersMap } from './util';

/**
 * A custom transport strategy for NestJS microservices that integrates with the '@connectrpc/connect-es' package.
 *
 * @remarks
 * This class extends the `Server` class provided by NestJS and implements the `CustomTransportStrategy` interface.
 *
 * @example
 * import { NestFactory } from '@nestjs/core';
 * import { MicroserviceOptions, Transport } from '@nestjs/microservices';
 * import { ServerBufConnect } from '@wolfcoded/nestjs-bufconnect';
 * import { AppModule } from './app/app.module';
 *
 * async function bootstrap() {
 *   const serverOptions: HttpOptions = {
 *     protocol: ServerProtocol.HTTP,
 *     port: 3000,
 *   }
 *
 *   const app = await NestFactory.createMicroservice<MicroserviceOptions>(
 *     AppModule, {
 *       strategy: new ServerBufConnect(serverOptions),
 *     }
 *   );
 *
 *   await app.listen();
 * }
 *
 * bootstrap();
 */
export class ServerBufConnect
  extends Server
  implements CustomTransportStrategy
{
  private readonly CustomMetadataStore: CustomMetadataStore | null = null;

  private server: HTTPServer | null = null;

  private readonly Options: ServerTypeOptions;

  /**
   * Constructor for ServerBufConnect.
   * @param options - The options for configuring the server.
   */
  constructor(options: ServerTypeOptions) {
    super();
    this.CustomMetadataStore = CustomMetadataStore.getInstance();
    this.Options = options;
  }

  /**
   * Starts the HTTP server, listening on the specified port.
   * @param callback - An optional callback to be executed when the server starts listening.
   * @returns {Promise<void>} A promise that resolves when the server starts listening.
   */
  async listen(
    callback: (error?: unknown, ...optionalParameters: unknown[]) => void
  ): Promise<void> {
    try {
      const router = this.buildRouter();
      this.server = new HTTPServer(this.Options, router);
      await this.server.listen();
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Stops the HTTP server.
   * @returns {Promise<void>} A promise that resolves when the server stops.
   */
  public async close(): Promise<void> {
    await this.server?.close();
  }

  /**
   * Adds a message handler for the given pattern.
   * @param pattern - The pattern associated with the message handler.
   * @param callback - The message handler function.
   * @param isEventHandler - Optional flag to mark the message handler as an event handler. Defaults to false.
   */
  public override addHandler(
    pattern: unknown,
    callback: MessageHandler,
    isEventHandler = false
  ) {
    const route = isString(pattern) ? pattern : JSON.stringify(pattern);
    callback.isEventHandler = isEventHandler;
    this.messageHandlers.set(route, callback);
  }

  /**
   * Builds the ConnectRouter with the server's message handlers.
   * @returns A function that takes a ConnectRouter and configures it with the server's message handlers.
   * @private
   */
  buildRouter() {
    return (router: ConnectRouter) => {
      if (this.CustomMetadataStore) {
        const serviceHandlersMap = createServiceHandlersMap(
          this.getHandlers(),
          this.CustomMetadataStore
        );
        addServicesToRouter(
          router,
          serviceHandlersMap,
          this.CustomMetadataStore
        );
      }
    };
  }
}
