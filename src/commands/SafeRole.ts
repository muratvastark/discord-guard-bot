import { GuildModel } from '../models/Guild';

const SafeRole: Backup.Command = {
    usages: ['safe-role', 'saferole', 'srole', 'srol'],
    execute: async ({ client, message, args }) => {
        if (args[0] === 'list') {
            message.channel.send(client.utils.indelibleRoles.map(role => `\`${(message.guild.roles.cache.get(role) || { name: role }).name}\``).join(', '));
            return;
        }
        
        const target = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        if (!target) return message.channel.send('Specify a valid role.');

        let operation = 'added'; 
        if (client.utils.indelibleRoles.includes(target.id)) {
            await GuildModel.updateOne({ id: message.guildId }, { $pull: { indelibleRoles: target.id } }, { upsert: true });
            client.utils.indelibleRoles = client.utils.indelibleRoles.filter(role => role !== target.id);
            operation = 'removed';
        } else {
            client.utils.indelibleRoles.push(target.id);
            await GuildModel.updateOne({ id: message.guildId }, { $push: { indelibleRoles: target.id } }, { upsert: true });
        }

        message.channel.send({ content: `\`${target.name}\` ${operation} in list.` });
    },
};

export default SafeRole;
