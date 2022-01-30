import { Client, Intents, IntentsString, User, Collection } from 'discord.js';
import { Utils } from './Utils';
import { CONFIG } from '../../config';
import { connect } from 'mongoose';
import * as pogger from 'pogger';

export class Core extends Client {
    public utils = new Utils(this);
    public commands = new Collection<string, Backup.Command>();
    public safes = new Collection<string, Backup.Safe>();
    public config = CONFIG;
    public logger = pogger;

    constructor() {
        super({
            intents: Object.keys(Intents.FLAGS) as IntentsString[],
            presence: {
                activities: [{ name: CONFIG.STATUS, type: 'WATCHING' }],
            },
        });
    }

    async connect() {
        this.logger.event('Loading commands...');
        await this.utils.loadCommands();

        this.logger.event('Loading events...');
        await this.utils.loadEvents();

        await this.login(CONFIG.TOKENS[0]);
        CONFIG.TOKENS.splice(0, 1);

        this.logger.info('Connecting MongoDB...');
        await connect(CONFIG.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
        });

        this.logger.success(`The system is activated. You can start the backup using the "${CONFIG.PREFIX}guard-menu" command on the server.`);
    }
}
