import fs from 'fs';
import path from 'path';
import * as ini from 'ini';

interface ServerConfig {
  host: string;
  port: string;
  version: string;
}

interface MainConfig {
  port: string;
  web_port?: string;
  logLevel?: string;
  logFormat?: string;
  host?: string;
}

export interface ParsedConfig {
  server_list: ServerConfig[];
  server: MainConfig;
}

function loadConfig(): ParsedConfig {
  const configPath = path.join(process.cwd(), 'data', 'config.ini');
  const content = fs.readFileSync(configPath, 'utf-8');
  const parsedIni = ini.parse(content);

  const parsedData: ParsedConfig = {
    server_list: [],
    server: { port: '25565' }, // Default port
  };

  // Iterate over all top-level keys in the parsed INI object
  for (const key in parsedIni) {
    if (key.startsWith('server_list')) {
      const serverListEntries = parsedIni[key];
      if (Array.isArray(serverListEntries)) {
        for (const entry of serverListEntries) {
          parsedData.server_list.push({
            host: entry.host || '',
            port: entry.port || '',
            version: entry.version || '',
          });
        }
      } else if (typeof serverListEntries === 'object') {
        parsedData.server_list.push({
          host: serverListEntries.host || '',
          port: serverListEntries.port || '',
          version: serverListEntries.version || '',
        });
      }
    } else if (key === 'server') {
      parsedData.server = {
        port: parsedIni.server.port || '25565',
        web_port: parsedIni.server.web_port || '8080',
        logLevel: parsedIni.server.logLevel || 'info',
        logFormat: parsedIni.server.logFormat || 'combined',
        host: parsedIni.server.host || '0.0.0.0',
      };
    }
  }
  return parsedData;
}

export const config = loadConfig();


