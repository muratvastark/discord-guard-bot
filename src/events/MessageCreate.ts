import { Message } from 'discord.js';

const MessageCreate: Backup.Event = {
    name: 'messageCreate',
    execute: async (client, message: Message) => {
        if (!message.content.startsWith(client.config.PREFIX)) return;
    
        const safe = client.safes.get(message.author.id);
        const safeRole = client.utils.safeRoles.find((sRole) =>
          message.guild.roles.cache.get(sRole.id)?.members.has(message.author.id) && sRole.developer 
        );
        if (!safe?.developer && !safeRole?.developer) return;

        const args = message.content.slice(client.config.PREFIX.length).trim().split(' ');
        const commandName = args.shift()?.toLowerCase() as string;
        const command = client.commands.find((command) => command.usages.includes(commandName));
        if (command) command.execute({ client, message, args });
    },
};

export default MessageCreate;
