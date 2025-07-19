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

interface ParsedConfig {
  server_list: ServerConfig[];
  server: MainConfig;
}

let cachedConfig: ParsedConfig | null = null;

export function parseIniConfig(filePath: string): ParsedConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const parsedIni = ini.parse(content);

  const parsedData: ParsedConfig = {
    server_list: [],
    server: { port: '25565' }, // Default port
  };

  // Iterate over all top-level keys in the parsed INI object
  for (const key in parsedIni) {
    if (key.startsWith('server_list')) {
      // ini.parse automatically handles multiple sections with the same name
      // by creating an array if they are identical, or by merging if keys are unique.
      // We need to ensure we get an array of server_list configurations.
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
        // Handle case where there's only one [server_list] or ini.parse merges them
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

  cachedConfig = parsedData;
  return parsedData;
}

// Example usage (for testing purposes, remove in production)
if (import.meta.url === `file://${process.argv[1]}`) {
  const configPath = path.join(process.cwd(), 'data', 'config.ini');
  try {
    const config = parseIniConfig(configPath);
    console.log(JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error parsing config:', error);
  }
}


