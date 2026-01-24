import { ConnectRouter } from '@connectrpc/connect';
import * as selfsigned from 'selfsigned';

import * as https from 'https';
import * as http from 'http';
import { HTTPServer } from './server';
import {
  Http2InsecureOptions,
  Http2Options,
  HttpOptions,
  HttpsOptions,
  ServerProtocol,
} from '../nestjs-bufconnect.interface';

describe('HTTPServer', () => {
  const mockRouter = (router: ConnectRouter) => {};
  let pems: selfsigned.GenerateResult;

  beforeAll(async () => {
    const attributes = [{ name: 'commonName', value: 'NestJsBufConnect' }];
    pems = await selfsigned.generate(attributes);
  });

  describe('listen', () => {
    it('should listen on HTTP protocol', async () => {
      const options: HttpOptions = {
        protocol: ServerProtocol.HTTP,
        port: 8080,
      };
      const server = new HTTPServer(options, mockRouter);
      await server.listen();

      // TS18047: 'server.server' is possibly 'null'.
      expect(server.server?.listening).toBe(true);
      await server.close();
    });

    it('should listen on HTTPS protocol', async () => {
      const options: HttpsOptions = {
        protocol: ServerProtocol.HTTPS,
        port: 8443,
        serverOptions: {
          key: pems.private,
          cert: pems.cert,
        },
      };
      const server = new HTTPServer(options, mockRouter);
      await server.listen();
      // TS18047: 'server.server' is possibly 'null'.
      expect(server.server?.listening).toBe(true);
      await server.close();
    });

    // Add similar tests for HTTP2 and HTTP2_INSECURE
  });

  describe('close', () => {
    it('should close the server if running', async () => {
      const options: HttpOptions = {
        protocol: ServerProtocol.HTTP,
        port: 8080,
      };
      const server = new HTTPServer(options, mockRouter);
      await server.listen();
      // TS18047: 'server.server' is possibly 'null'.
      expect(server.server?.listening).toBe(true);

      await server.close();
      expect(server.server).toBe(null);
    });

    it('should throw an error if server is not running', async () => {
      const options: HttpOptions = {
        protocol: ServerProtocol.HTTP,
        port: 8080,
      };
      const server = new HTTPServer(options, mockRouter);
      await expect(server.close()).rejects.toThrow('Server is not running');
    });
  });

  describe('startServer', () => {
    it('should throw an error for invalid protocol', async () => {
      const options: HttpOptions = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        protocol: 'INVALID_PROTOCOL' as ServerProtocol,
        port: 8080,
      };
      const server = new HTTPServer(options, mockRouter);
      await expect(server.listen()).rejects.toThrow('Invalid protocol option');
    });
  });

  describe('createHttpServer', () => {
    it('should create an instance of http.Server', () => {
      const options: HttpOptions = {
        protocol: ServerProtocol.HTTP,
        port: 8080,
      };
      const server = new HTTPServer(options, mockRouter);
      const httpServer = server.createHttpServer();
      expect(httpServer).toBeInstanceOf(http.Server);
    });
  });

  describe('createHttpsServer', () => {
    it('should create an instance of https.Server', () => {
      const options: HttpsOptions = {
        protocol: ServerProtocol.HTTPS,
        port: 8443,
        serverOptions: {
          key: pems.private,
          cert: pems.cert,
        },
      };
      const server = new HTTPServer(options, mockRouter);
      const httpsServer = server.createHttpsServer();
      expect(httpsServer).toBeInstanceOf(https.Server);
    });
  });

  describe('createHttp2Server', () => {
    it('should create an instance with listen method', () => {
      const options: Http2Options = {
        protocol: ServerProtocol.HTTP2,
        port: 8080,
        serverOptions: {},
      };
      const server = new HTTPServer(options, mockRouter);
      const http2Server = server.createHttp2Server();
      expect(typeof http2Server.listen).toBe('function');
    });
  });

  describe('createHttp2InsecureServer', () => {
    it('should create an instance with listen method', () => {
      const options: Http2InsecureOptions = {
        protocol: ServerProtocol.HTTP2_INSECURE,
        port: 8080,
        serverOptions: {},
      };
      const server = new HTTPServer(options, mockRouter);
      const http2Server = server.createHttp2InsecureServer();
      expect(typeof http2Server.listen).toBe('function');
    });
  });
});
