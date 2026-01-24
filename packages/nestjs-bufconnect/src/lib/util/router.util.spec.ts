import { ConnectRouter, createConnectRouter } from '@connectrpc/connect';
import { MessageHandler } from '@nestjs/microservices';
import { ElizaService, SayRequest } from '../../test-utils/mocks/service.test';
import { MethodType } from '../nestjs-bufconnect.interface';
import { CustomMetadataStore } from '../nestjs-bufconnect.provider';
import { addServicesToRouter, createServiceHandlersMap } from './router.util';

describe('router', () => {
  let router: ConnectRouter;
  let customMetadataStore: CustomMetadataStore;
  let handlers: Map<string, MessageHandler>;

  const sayHandler: MessageHandler = (message: SayRequest) =>
    Promise.resolve({
      sentence: `You said: ${message.sentence}`,
    });

  beforeEach(() => {
    router = createConnectRouter();
    customMetadataStore = CustomMetadataStore.getInstance();
    customMetadataStore.set(ElizaService.typeName, ElizaService);

    handlers = new Map<string, MessageHandler>();
  });

  describe('createServiceHandlersMap', () => {
    it('should create a service handlers map', () => {
      handlers.set(
        JSON.stringify({
          service: ElizaService.typeName,
          rpc: 'say',
          streaming: MethodType.NO_STREAMING,
        }),
        sayHandler
      );

      const serviceHandlersMap = createServiceHandlersMap(
        handlers,
        customMetadataStore
      );

      expect(serviceHandlersMap[ElizaService.typeName]).toBeDefined();
      expect(serviceHandlersMap[ElizaService.typeName]).toHaveProperty('say');
    });

    it('should not add handler if handlerMetadata is not defined', () => {
      // Add an undefined handler for the test
      handlers.set(
        JSON.stringify({
          service: ElizaService.typeName,
          rpc: 'undefinedHandler',
          streaming: MethodType.NO_STREAMING,
        }),
        {} as MessageHandler
      );

      const serviceHandlersMap = createServiceHandlersMap(
        handlers,
        customMetadataStore
      );

      expect(serviceHandlersMap[ElizaService.typeName]).toBeUndefined();
    });

    it('should not add handler if service is not found in customMetadataStore', () => {
      const invalidServiceName = 'InvalidService';

      handlers.set(
        JSON.stringify({
          service: invalidServiceName,
          rpc: 'say',
          streaming: MethodType.NO_STREAMING,
        }),
        sayHandler
      );

      const serviceHandlersMap = createServiceHandlersMap(
        handlers,
        customMetadataStore
      );

      expect(serviceHandlersMap[invalidServiceName]).toBeUndefined();
    });

    it('should not add handler if methodProto is not found', () => {
      const invalidMethodName = 'invalidMethod';

      handlers.set(
        JSON.stringify({
          service: ElizaService.typeName,
          rpc: invalidMethodName,
          streaming: MethodType.NO_STREAMING,
        }),
        sayHandler
      );

      const serviceHandlersMap = createServiceHandlersMap(
        handlers,
        customMetadataStore
      );

      // Check if the serviceHandlersMap entry for ElizaService.typeName exists
      if (serviceHandlersMap[ElizaService.typeName]) {
        // Check for the absence of the invalidMethodName property
        expect(serviceHandlersMap[ElizaService.typeName]).not.toHaveProperty(
          invalidMethodName
        );
      } else {
        // If the entry does not exist, the test case is successful as the handler was not added
        expect(serviceHandlersMap[ElizaService.typeName]).toBeUndefined();
      }
    });
  });

  describe('addServicesToRouter', () => {
    it('should add services to the router', () => {
      handlers.set(
        JSON.stringify({
          service: ElizaService.typeName,
          rpc: 'say',
          streaming: MethodType.NO_STREAMING,
        }),
        sayHandler
      );

      const serviceHandlersMap = createServiceHandlersMap(
        handlers,
        customMetadataStore
      );

      addServicesToRouter(router, serviceHandlersMap, customMetadataStore);

      expect(router.handlers).toHaveLength(3);
      expect(router.handlers[0].service).toBe(ElizaService);
      expect(router.handlers[0].service.method).toHaveProperty('say');
    });

    it('should create a service handlers map with RX_STREAMING', () => {
      handlers.set(
        JSON.stringify({
          service: ElizaService.typeName,
          rpc: 'say',
          streaming: MethodType.RX_STREAMING,
        }),
        sayHandler
      );

      const serviceHandlersMap = createServiceHandlersMap(
        handlers,
        customMetadataStore
      );

      expect(serviceHandlersMap[ElizaService.typeName]).toBeDefined();
      expect(serviceHandlersMap[ElizaService.typeName]).toHaveProperty('say');
    });
  });
});
