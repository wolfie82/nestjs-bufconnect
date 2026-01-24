import { DescService } from '@bufbuild/protobuf';
import { MessagePattern } from '@nestjs/microservices';
import {
  BUF_TRANSPORT,
  METHOD_DECORATOR_KEY,
  STREAM_METHOD_DECORATOR_KEY,
} from './nestjs-bufconnect.constants';
import {
  ConstructorWithPrototype,
  FunctionPropertyDescriptor,
  MethodKey,
  MethodKeys,
  MethodType,
} from './nestjs-bufconnect.interface';
import { CustomMetadataStore } from './nestjs-bufconnect.provider';
import { createBufConnectMethodMetadata } from './util';

function isFunctionPropertyDescriptor(
  descriptor: PropertyDescriptor | undefined
): descriptor is FunctionPropertyDescriptor {
  return descriptor !== undefined && typeof descriptor.value === 'function';
}

/**
 * Decorator for defining a gRPC service and its methods. It uses the metadata from
 * `BufMethod` and `BufStreamMethod` to initialize the service and its methods.
 *
 * @param serviceName - A `DescService` object that defines the gRPC service.
 * @returns A class decorator that can be applied to a class implementing the gRPC service.
 */
export const BufService =
  (serviceName: DescService): ClassDecorator =>
  (target: ConstructorWithPrototype) => {
    const processMethodKey = (methodImpl: MethodKey) => {
      const functionName = methodImpl.key;
      const { methodType } = methodImpl;

      const descriptor = Object.getOwnPropertyDescriptor(
        target.prototype,
        functionName
      );

      if (isFunctionPropertyDescriptor(descriptor)) {
        const metadata = createBufConnectMethodMetadata(
          descriptor.value,
          functionName,
          serviceName.typeName,
          functionName,
          methodType
        );

        const customMetadataStore = CustomMetadataStore.getInstance();
        customMetadataStore.set(serviceName.typeName, serviceName);

        MessagePattern(metadata, BUF_TRANSPORT)(
          target.prototype,
          functionName,
          descriptor
        );
      }
    };

    const unaryMethodKeys: MethodKeys =
      Reflect.getMetadata(METHOD_DECORATOR_KEY, target) || [];
    const streamMethodKeys: MethodKeys =
      Reflect.getMetadata(STREAM_METHOD_DECORATOR_KEY, target) || [];

    unaryMethodKeys.forEach((methodImpl) => processMethodKey(methodImpl));
    streamMethodKeys.forEach((methodImpl) => processMethodKey(methodImpl));
  };

/**
 * Decorator for a unary gRPC method within a `BufService`. It stores the method's metadata,
 * which is later used by `BufService` to initialize the method.
 *
 * @returns A method decorator that can be applied to a method implementing a unary gRPC method.
 */
export const BufMethod =
  (): MethodDecorator => (target: object, key: string | symbol) => {
    const metadata: MethodKey = {
      key: key.toString(),
      methodType: MethodType.NO_STREAMING,
    };

    const existingMethods =
      Reflect.getMetadata(METHOD_DECORATOR_KEY, target.constructor) ||
      new Set();

    if (!existingMethods.has(metadata)) {
      existingMethods.add(metadata);
      Reflect.defineMetadata(
        METHOD_DECORATOR_KEY,
        existingMethods,
        target.constructor
      );
    }
  };

/**
 * Decorator for a streaming gRPC method within a `BufService`. It stores the method's metadata,
 * which is later used by `BufService` to initialize the method.
 *
 * @returns A method decorator that can be applied to a method implementing a streaming gRPC method.
 */
export const BufStreamMethod =
  (): MethodDecorator => (target: object, key: string | symbol) => {
    const metadata: MethodKey = {
      key: key.toString(),
      methodType: MethodType.RX_STREAMING,
    };

    const existingMethods =
      Reflect.getMetadata(STREAM_METHOD_DECORATOR_KEY, target.constructor) ||
      new Set();

    if (!existingMethods.has(metadata)) {
      existingMethods.add(metadata);
      Reflect.defineMetadata(
        STREAM_METHOD_DECORATOR_KEY,
        existingMethods,
        target.constructor
      );
    }
  };
