import {
  FastifyInstance,
  FastifyLoggerInstance,
  FastifyLogFn,
  FastifyPluginOptions,
} from 'fastify';
import { Bindings } from 'fastify/types/logger';
import fp from 'fastify-plugin';
import { v4 as uuidV4 } from 'uuid';

function createLogFn(
  inst: FastifyLoggerInstance,
  method: FastifyLogFn,
  traceId: string
) {
  return (...args: any[]) => {
    let obj;
    let msg;
    if (typeof args[0] === 'object') {
      obj = args.shift();
      msg = args.shift();
    } else if (typeof args[0] === 'string') {
      obj = {};
      msg = args.shift();
    }
    obj.traceId = traceId;
    method.call(inst, obj, msg, ...args);
  };
}

class LoggerWrapper implements FastifyLoggerInstance {
  constructor(private logger: FastifyLoggerInstance, private traceId: string) {}
  info = createLogFn(this.logger, this.logger.info, this.traceId);
  warn = createLogFn(this.logger, this.logger.warn, this.traceId);
  error = createLogFn(this.logger, this.logger.error, this.traceId);
  fatal = createLogFn(this.logger, this.logger.fatal, this.traceId);
  trace = createLogFn(this.logger, this.logger.trace, this.traceId);
  debug = createLogFn(this.logger, this.logger.debug, this.traceId);
  child(bindings: Bindings): FastifyLoggerInstance {
    return this.logger.child(bindings);
  }
}

export class TracingOptions {
  constructor(public idHeaderName?: string) {}
}

function tracing(
  fastify: FastifyInstance,
  options: TracingOptions & FastifyPluginOptions,
  next: Function
) {
  const headerName = (options.headerName || 'X-Trace-Id').toLowerCase();
  fastify.addHook('onRequest', (request, _reply, done) => {
    const traceIdHeader = request.headers[headerName];
    const traceId = traceIdHeader ? (traceIdHeader as string) : uuidV4();
    request.log = new LoggerWrapper(request.log, traceId);
    done();
  });
  next();
}

export default fp(tracing, { fastify: '3.x', name: 'tracing' });
