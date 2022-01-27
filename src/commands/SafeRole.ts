import { GuildModel } from '../models/Guild';

const SafeRole: Backup.Command = {
    usages: ['safe-role', 'saferole', 'srole', 'srol'],
    execute: async ({ client, message, args }) => {
        const target = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        if (!target) return message.channel.send('Specify a valid role.');

        const data = await GuildModel.findOne({ id: message.guildId }) || new GuildModel({ id: message.guildId });
        let operation = 'added'; 
        if (data.indelibleRoles.includes(target.id)) {
            data.indelibleRoles = data.indelibleRoles.filter(role => role !== target.id);
            client.utils.indelibleRoles = client.utils.indelibleRoles.filter(role => role !== target.id);
            operation = 'removed';
        } else {
            client.utils.indelibleRoles.push(target.id);
            data.indelibleRoles.push(target.id);
        }

        data.save();
        message.channel.send({ content: `\`${target.name}\` ${operation} in list.` })
    },
};

export default SafeRole;
