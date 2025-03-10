import performSearch from '../../performSearch';
import { RouteMiddleware } from '../../../typings/middlewares';
import { extractFilter } from '../../performSearch';
import checkFilter from '../../../utils/checkFilter';
import crypto from 'crypto';
import httpStatus from 'http-status';

export const handleGet: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    await performSearch(models.plugin, {}, ctx, {
      defaultSort: { createdAt: -1 },
      allowUnlimited: true
    });
  };
};

export const handlePatch: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const pluginId = ctx.params.pluginId;
    await models.plugin.modifyOne(pluginId, ctx.request.body);
    ctx.body = null;
  };
};

const searchableFields = ['type'];

export const handleSearch: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const filter = extractFilter(ctx);
    if (!checkFilter(filter!, searchableFields))
      ctx.throw(httpStatus.BAD_REQUEST, 'Bad filter.');

    await performSearch(models.plugin, filter, ctx, {
      defaultSort: { pluginId: 1 },
      allowUnlimited: true
    });
  };
};

const generateRemoteCadPluginId = (
  adapter: string,
  pluginName: string,
  version: string
): string => {
  const input = `${adapter}:${pluginName}:${version}`;
  return `rmt-${crypto.createHash('sha256').update(input).digest('hex')}`;
};

export const handlePost: RouteMiddleware = ({ models }) => {
  return async (ctx, next) => {
    const values = ctx.request.body;
    const { type, pluginName, version, runConfiguration } = values;
    if (!type) ctx.throw(httpStatus.BAD_REQUEST, 'type is required.');
    if (type === 'CAD+remote') {
      values.pluginId = generateRemoteCadPluginId(
        runConfiguration.adapter,
        pluginName,
        version
      );
      const existing = await models.plugin.findById(values.pluginId);
      if (existing) {
        ctx.throw(
          httpStatus.BAD_REQUEST,
          'The combination of adaptor, pluginName, and version must be unique.'
        );
      }
    }

    await models.plugin.insert(values);
    ctx.status = httpStatus.CREATED;
  };
};
