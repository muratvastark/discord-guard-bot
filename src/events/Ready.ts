import { GuildModel } from '../models/Guild';
import { Team } from 'discord.js';

const Ready: Backup.Event = {
  name: 'ready',
  execute: async (client) => {
    setInterval(async () => {
      if (client.utils.danger === false) await client.utils.getBackup();
    }, 1000 * 60 * 60);

    await client.application.fetch();
    const ownerID = client.application.owner instanceof Team ? (client.application.owner as Team).ownerId : client.application.owner.id;
    client.safes.set(ownerID, { developer: true });
    client.safes.set(client.user.id, { developer: true });

    const guild = client.guilds.cache.get(client.config.GUILD_ID);
    if (!guild) return client.logger.warning(`WARN: ${client.user.tag} is not in server!`);

    client.utils.guildSettings = {
      name: guild.name,
      icon: guild.iconURL({ dynamic: true }),
      banner: guild.bannerURL(),
    };

    const data = await GuildModel.findOne({ id: client.config.GUILD_ID });
    if (!data) return;
  
    client.utils.indelibleRoles = data.indelibleRoles;

    const safes = [...new Set<string>([...data.safeBans, ...data.safeDevelopers, ...data.safeChannels, ...data.safeOwners, ...data.safeRoles])];
    safes.forEach((safe) => {
      const role = guild.roles.cache.get(safe);
      const auths = {
        ban: data.safeBans.includes(safe), 
        channel: data.safeChannels.includes(safe), 
        developer: data.safeDevelopers.includes(safe), 
        owner: data.safeOwners.includes(safe), 
        role: data.safeRoles.includes(safe) 
      };

      if (role) client.utils.safeRoles.push({ id: safe, ...auths });
      else client.safes.set(safe, auths);
    });
  },
};

export default Ready;
