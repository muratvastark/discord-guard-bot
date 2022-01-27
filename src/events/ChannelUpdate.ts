import { GuildBasedChannel } from 'discord.js';
import { ChannelModel } from '../models/Channel';

const ChannelUpdate: Backup.Event = {
    name: 'channelUpdate',
    execute: async (client, oldChannel: GuildBasedChannel, newChannel: GuildBasedChannel) => {
        const entry = await newChannel.guild.fetchAuditLogs({ limit: 1, type: 'CHANNEL_UPDATE' }).then((audit) => audit.entries.first());
        if (!entry || Date.now() - entry.createdTimestamp > 5000) return;
      
        const safe = client.safes.get(entry.executor.id) || { developer: false, owner: false, channel: false };
        if (safe.developer || ((safe.owner || safe.channel) && !client.utils.checkLimits(entry.executor.id, 'update_channel'))) return;

        client.utils.danger = true;
        await newChannel.guild.members.ban(entry.executor.id);
        await client.utils.closePermissions();
        if (newChannel.guild.publicUpdatesChannel) newChannel.guild.publicUpdatesChannel.send(`[\`UPDATE-CHANNEL\`] **${entry.executor.tag}**`);
              
        const data = await ChannelModel.findOne({ id: newChannel.id });
        if (!data) return client.logger.warning(`WARN: #${oldChannel.name} (${oldChannel.id}) was not created because the data could not be found.`);
      
        newChannel.edit({
          name: data.name,
          nsfw: data.nsfw,
          parent: data.parent,
          topic: data.topic,
          position: data.position,
          userLimit: data.userLimit,
          permissionOverwrites: data.permissionOverwrites,
        });
    },
};

export default ChannelUpdate;