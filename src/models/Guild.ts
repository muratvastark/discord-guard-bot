import { prop, getModelForClass, modelOptions } from '@typegoose/typegoose';

@modelOptions({ options: { customName: 'Guilds', allowMixed: 0 } })
export class GuildSchema {
  @prop({ type: () => String, required: true, unique: true })
  id!: string;

  @prop({ type: () => [String], default: [] })
  indelibleRoles!: string[];

  @prop({ type: () => [Object], default: [] })
  permissions!: Backup.Permission[];

  @prop({ type: () => [String], default: [] })
  safeDevelopers!: string[];

  @prop({ type: () => [String], default: [] })
  safeOwners!: string[];

  @prop({ type: () => [String], default: [] })
  safeRoles!: string[];

  @prop({ type: () => [String], default: [] })
  safeBans!: string[];

  @prop({ type: () => [String], default: [] })
  safeChannels!: string[];
}

export const GuildModel = getModelForClass(GuildSchema);
