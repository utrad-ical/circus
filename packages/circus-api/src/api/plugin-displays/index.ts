import fs from 'fs-extra';
import httpStatus from 'http-status';
import path from 'path';
import createDockerFileExtractor from '../../utils/dockerFileExtractor';
import { RouteMiddleware } from '../../typings/middlewares';

export const handleGet: RouteMiddleware = ({
  pluginCachePath,
  models,
  logger
}) => {
  const reading = new Map<string, Promise<void>>();

  return async (ctx, next) => {
    const { pluginId, path: requestPath } = ctx.params as {
      pluginId: string;
      path: string;
    };
    if (!/^[a-z0-9]+$/.test(pluginId) || /\.\./.test(requestPath)) {
      throw ctx.throw(httpStatus.NOT_FOUND);
    }

    if (!pluginId) ctx.throw(httpStatus.NOT_FOUND);
    const plugin = await models.plugin.findByIdOrFail(pluginId);
    const displaysDir = path.join(pluginCachePath, pluginId, 'displays');

    const read = async (): Promise<string> => {
      try {
        await fs.access(displaysDir);
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          logger.info(
            'Trying to extract custom display files from the plug-in ' +
              `${plugin.name} (ID: ${pluginId}).`
          );
          if (reading.has(pluginId)) {
            await reading.get(pluginId);
          } else {
            const promise = (async () => {
              const extractor = createDockerFileExtractor(pluginId);
              try {
                await fs.ensureDir(displaysDir);
                await extractor.extractToPath('/displays', displaysDir);
              } finally {
                await extractor.dispose();
              }
            })();
            reading.set(pluginId, promise);
            await promise;
          }
        } else throw err;
      }
      const filePath = path.join(displaysDir, requestPath);
      try {
        return await fs.readFile(filePath, 'utf-8');
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          logger.error(
            `Plug-in ${plugin.name} (${pluginId}) does not seem to` +
              'contain the specified file for custom displays.'
          );
          ctx.throw(httpStatus.NOT_FOUND);
        } else throw err;
        return '';
      }
    };

    const content = await read();
    ctx.type = 'text/javascript';
    ctx.body = content;
  };
};
