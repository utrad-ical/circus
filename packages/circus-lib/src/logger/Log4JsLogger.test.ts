import Log4JsLogger from './Log4JsLogger';
import * as path from 'path';
import * as fs from 'fs-extra';
import sleep from '../sleep';

const logDir = path.resolve(__dirname, '../../testdata/Log4JsLogger');

describe('Log4JsLogger', () => {
  const log4jsConfig = {
    appenders: {
      off: { type: "logLevelFilter", appender: "console", level: "off" },
      file: {
        type: "dateFile",
        filename: path.join(logDir, "file.log"),
        keepFileExt: true
      }
    },
    categories: {
      default: { appenders: ["off"], level: "off" },
      file: {
        appenders: ["file"],
        level: "ALL"
      },
    }
  };

  beforeAll( async () => {
    await fs.emptyDir(logDir);
    Log4JsLogger.configure(log4jsConfig);
  } );

  afterAll( async () => {
    await fs.emptyDir(logDir);
  } );

  it('must do logging', async () => {
    const logger = new Log4JsLogger({category: 'file'});

    logger.trace('Something trace content');
    logger.debug('Something debug content');
    logger.info('Something info content');
    logger.warn('Something warn content');
    logger.error('Something error content');
    logger.fatal('Something fatal content');

    await sleep(100);

    const log = await fs.readFile(
      path.join(logDir, 'file.log'),
      'utf8'
    );
    expect(log).toMatch(/Something trace content/);
    expect(log).toMatch(/Something debug content/);
    expect(log).toMatch(/Something info content/s);
    expect(log).toMatch(/Something warn content/s);
    expect(log).toMatch(/Something error content/s);
    expect(log).toMatch(/Something fatal content/s);
  })
});
