import { Core } from './base/Core';

const client = new Core();

client.connect();

process.on('unhandledRejection', (error: Error) => {
    if (error.message === 'Missing Permissions') return;
    client.logger.warning(`WARN: ${error.name} | ${error.message}`);
});
