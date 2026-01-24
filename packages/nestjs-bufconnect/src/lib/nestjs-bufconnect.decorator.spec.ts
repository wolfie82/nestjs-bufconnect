import { ConnectRouter, createClient } from '@connectrpc/connect';
import {
  connectNodeAdapter,
  createGrpcTransport,
} from '@connectrpc/connect-node';
import { MessageHandler } from '@nestjs/microservices';
import * as http2 from 'http2';
import { ElizaService, SayRequest } from '../test-utils/mocks/service.test';
import { BufMethod, BufService } from './nestjs-bufconnect.decorator';
import { MethodType } from './nestjs-bufconnect.interface';
import { CustomMetadataStore } from './nestjs-bufconnect.provider';
import {
  addServicesToRouter,
  createPattern,
  createServiceHandlersMap,
} from './util';

@BufService(ElizaService)
class TestService {
  // eslint-disable-next-line class-methods-use-this
  @BufMethod()
  say(request: SayRequest) {
    return { sentence: `you said: ${request.sentence}` };
  }
}
describe('BufMethod decorators', () => {
  it('should properly decorate a class with BufService and BufMethod and run', async () => {
    let port = -1;
    function routes(router: ConnectRouter) {
      const customMetadataStore = CustomMetadataStore.getInstance();
      const handlers = new Map<string, MessageHandler>();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/require-await
      const handler: MessageHandler = async (data: any) => {
        const serviceInstance = new TestService();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return serviceInstance.say(data);
      };

      const pattern = createPattern(
        ElizaService.typeName,
        'say',
        MethodType.NO_STREAMING
      );
      handlers.set(pattern, handler);

      const serviceHandlersMap = createServiceHandlersMap(
        handlers,
        customMetadataStore
      );
      addServicesToRouter(router, serviceHandlersMap, customMetadataStore);
    }

    function startServer() {
      return new Promise<http2.Http2Server>((resolve) => {
        const handler = connectNodeAdapter({ routes });
        const server = http2.createServer(handler).listen(0, () => {
          const a = server.address();
          if (a !== null && typeof a !== 'string') {
            port = a.port;
          }
          resolve(server);
        });
      });
    }

    async function runClient() {
      const transport = createGrpcTransport({
        baseUrl: `http://localhost:${port}`,
      });
      const client = createClient(ElizaService, transport);
      const response = await client.say({ sentence: 'I feel happy.' });
      expect(response.sentence).toBe('you said: I feel happy.');
    }

    const server = await startServer();
    await runClient();
    server.close();
  });
});
