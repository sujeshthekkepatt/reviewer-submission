import * as fs from 'fs';
import { Config as KnexConfig } from 'knex';
import { get } from 'lodash';

interface DatabaseConnectionConfig {
    type: string;
    host: string;
    port: number;
    database: string;
    username?: string;
    password?: string;
}

interface Config {
    port: number;
    connections: [];
}

export class ConfigService {
    private readonly config: Config;

    constructor(filePath: string) {
        if (fs.existsSync(filePath)) {
            this.config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } else {
            throw new Error(`Config file not found at ${filePath}`);
        }
    }

    getPort(): number {
        return this.config.port;
    }

    getSubmissionRepositoryConnection(): KnexConfig {
        const config: DatabaseConnectionConfig = get(this.config, 'databases.submission');

        return this.getKnexDatabaseConfig(config);
    }

    getSurveyResponseRepositoryConnection(): KnexConfig {
        const config: DatabaseConnectionConfig = get(this.config, 'databases.survey');

        return this.getKnexDatabaseConfig(config);
    }

    private getKnexDatabaseConfig(config: DatabaseConnectionConfig): KnexConfig {
        if (config.type === 'sqlite3') {
            return {
                client: 'sqlite3',
                connection: {
                    filename: config.database,
                },
                useNullAsDefault: true,
            };
        } else {
            return {
                client: config.type,
                connection: {
                    host: config.host,
                    database: config.database,
                    user: config.username,
                    password: config.password,
                    port: config.port,
                },
            };
        }
    }
}
