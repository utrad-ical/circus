import Log4JsLogger, { getRecording } from './Log4JsLogger';
import * as path from 'path';
import * as fs from 'fs-extra';
import sleep from '../sleep';

const logDir = path.resolve(__dirname, '../../testdata/Log4JsLogger');

describe('Log4JsLogger', () => {
  beforeAll(async () => {
    await fs.emptyDir(logDir);
  });

  afterAll(async () => {
    await fs.emptyDir(logDir);
  });

  describe('defaults', () => {
    it('must do logging to memory by default', async () => {
      Log4JsLogger.configured = false;
      Log4JsLogger.configure(null);
      const logger = new Log4JsLogger();

      const message = 'Some trace content';
      logger.trace(message);

      expect(
        getRecording()
          .replay()
          .pop()
          .data.pop()
      ).toEqual(message);
    });
  });

  describe('configure with defaults', () => {
    beforeAll(async () => {
      Log4JsLogger.configured = false;
      Log4JsLogger.setDefaults({
        appenders: {
          file: {
            type: 'dateFile',
            filename: path.join(logDir, 'default.log'),
            keepFileExt: true
          }
        },
        categories: {
          default: { appenders: ['file'], level: 'debug' }
        }
      });
    });

    it('must use default', async () => {
      Log4JsLogger.configure(null);
      const logger = new Log4JsLogger();

      logger.info('Some info content');
      await sleep(100);

      const log = await fs.readFile(path.join(logDir, 'default.log'), 'utf8');
      expect(log).toMatch(/Some info content/);
    });

    it('must default with overwrite config', async () => {
      Log4JsLogger.configured = false;
      Log4JsLogger.configure({
        categories: {
          default: { level: 'fatal' }
        }
      });
      const logger = new Log4JsLogger();
      const message = 'Some error content';
      logger.error(message);

      await sleep(100);

      const log = await fs.readFile(path.join(logDir, 'default.log'), 'utf8');
      expect(log).not.toMatch(/error/);
    });
  });

  describe('configured', () => {
    const log4jsConfig = {
      appenders: {
        off: { type: 'logLevelFilter', appender: 'console', level: 'off' },
        file: {
          type: 'dateFile',
          filename: path.join(logDir, 'file.log'),
          keepFileExt: true
        }
      },
      categories: {
        default: { appenders: ['off'], level: 'off' },
        file: {
          appenders: ['file'],
          level: 'ALL'
        }
      }
    };

    it('must do logging', async () => {
      Log4JsLogger.configured = false;
      Log4JsLogger.configure(log4jsConfig);
      const logger = new Log4JsLogger({ category: 'file' });

      logger.trace('Some trace content');
      logger.debug('Some debug content');
      logger.info('Some info content');
      logger.warn('Some warn content');
      logger.error('Some error content');
      logger.fatal('Some fatal content');

      await sleep(100);

      const log = await fs.readFile(path.join(logDir, 'file.log'), 'utf8');
      expect(log).toMatch(/Some trace content/);
      expect(log).toMatch(/Some debug content/);
      expect(log).toMatch(/Some info content/);
      expect(log).toMatch(/Some warn content/);
      expect(log).toMatch(/Some error content/);
      expect(log).toMatch(/Some fatal content/);
    });
  });
});
