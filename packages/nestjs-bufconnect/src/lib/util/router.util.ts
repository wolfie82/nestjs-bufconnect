import type { DescService } from '@bufbuild/protobuf';
import { ConnectRouter, ServiceImpl } from '@connectrpc/connect';
import { MessageHandler } from '@nestjs/microservices';
import { parse } from 'node:path/win32';
import { lastValueFrom, Observable } from 'rxjs';
import { BufConnectPattern, MethodType } from '../nestjs-bufconnect.interface';
import { CustomMetadataStore } from '../nestjs-bufconnect.provider';
import { toAsyncGenerator, transformToObservable } from './async.util';

/**
 * Creates a string of a JSON serialized format representing a gRPC service pattern.
 *
 * @param service - The name of the service which should match the gRPC service definition name.
 * @param methodName - The name of the method which is coming after the rpc keyword.
 * @param streaming - The GrpcMethodStreamingType parameter which should correspond to the stream keyword in the gRPC service request part.
 * @returns A JSON string representing the service pattern.
 */
export const createPattern = (
  service: string,
  methodName: string,
  streaming: MethodType
): string =>
  JSON.stringify({
    service,
    rpc: methodName,
    streaming,
  } as BufConnectPattern);

/**
 * Adds services to the given ConnectRouter using the provided serviceHandlersMap and customMetadataStore.
 *
 * @param router - The ConnectRouter to which services will be added.
 * @param serviceHandlersMap - An object containing service implementations for each service name.
 * @param customMetadataStore - A store containing metadata for the services.
 */
export const addServicesToRouter = (
  router: ConnectRouter,
  serviceHandlersMap: Record<string, Partial<ServiceImpl<DescService>>>,
  customMetadataStore: CustomMetadataStore
) => {
  Object.keys(serviceHandlersMap).forEach((serviceName) => {
    const service = customMetadataStore.get(serviceName);
    if (service) {
      router.service(service, serviceHandlersMap[serviceName]);
    }
  });
};

/**
 * Creates a map of service handlers using the provided handlers and customMetadataStore.
 * The map is keyed by service names with values being partial implementations of the DescService.
 *
 * @param handlers - A map of message handlers, keyed by JSON string patterns.
 * @param customMetadataStore - A store containing metadata for the services.
 * @returns A map of service handlers keyed by service names.
 */
export const createServiceHandlersMap = (
  handlers: Map<string, MessageHandler>,
  customMetadataStore: CustomMetadataStore
): Record<string, Partial<ServiceImpl<DescService>>> => {
  let serviceHandlersMap: Record<
    string,
    Partial<ServiceImpl<DescService>>
  > = {};

  handlers.forEach((handlerMetadata, pattern) => {
    const parsedPattern: {
      service: string;
      rpc: string;
      streaming: MethodType;
    } = JSON.parse(pattern);

    if (handlerMetadata) {
      const service = customMetadataStore.get(parsedPattern.service);
      const methodProto = service?.method[parsedPattern.rpc];

      if (service && methodProto) {
        if (!serviceHandlersMap[parsedPattern.service]) {
          serviceHandlersMap[parsedPattern.service] = {};
        }

        switch (parsedPattern.streaming) {
          case MethodType.NO_STREAMING: {
            // @ts-ignore
            serviceHandlersMap[parsedPattern.service][parsedPattern.rpc] =
              async (request: unknown, context: unknown) => {
                const result = handlerMetadata(request, context);
                const resultOrDeferred = await result;
                return lastValueFrom(transformToObservable(resultOrDeferred));
              };
            break;
          }
          case MethodType.RX_STREAMING: {
            // @ts-ignore
            serviceHandlersMap[parsedPattern.service][parsedPattern.rpc] =
              async function* rxStreamingHandler(
                request: unknown,
                context: unknown
              ): AsyncGenerator<unknown> {
                const result = handlerMetadata(request, context);
                const streamOrValue = await result;
                yield* toAsyncGenerator<unknown>(
                  streamOrValue as Observable<unknown> | AsyncGenerator<unknown>
                );
              };
            break;
          }
          default: {
            throw new Error('Invalid streaming type');
          }
        }
      }
    }
  });

  return serviceHandlersMap;
};

/**
 * Creates metadata for a gRPC method within a BufService.
 *
 * @param target - The object containing the method implementation.
 * @param key - The method name, as a string or symbol.
 * @param service - The name of the service, or undefined if it should be inferred from the target's constructor.
 * @param method - The name of the method, or undefined if it should be inferred from the key.
 * @param streaming - The streaming type of the method, defaulting to MethodType.NO_STREAMING.
 * @returns An object containing the metadata for the gRPC method.
 */
export const createBufConnectMethodMetadata = (
  target: object,
  key: string | symbol,
  service: string | undefined,
  method: string | undefined,
  streaming = MethodType.NO_STREAMING
) => {
  const capitalizeFirstLetter = (input: string) =>
    input.charAt(0).toUpperCase() + input.slice(1);

  if (!service) {
    const { name } = target.constructor;
    return {
      service: name,
      rpc: capitalizeFirstLetter(key as string),
      streaming,
    };
  }
  if (service && !method) {
    return { service, rpc: capitalizeFirstLetter(key as string), streaming };
  }
  return { service, rpc: method, streaming };
};
