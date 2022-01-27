import { prop, getModelForClass, modelOptions } from '@typegoose/typegoose';
import { PermissionString } from 'discord.js';

@modelOptions({ options: { customName: 'Roles', allowMixed: 0 } })
export class RoleSchema {
  @prop({ type: () => String, required: true, unique: true })
  id!: string;

  @prop({ type: () => String, required: true })
  name!: string;

  @prop({ type: () => Number, required: true })
  color!: number;

  @prop({ type: () => Number, required: true })
  position!: number;

  @prop({ type: () => [String], required: true })
  permissions!: PermissionString[];

  @prop({ type: () => [Object], required: true })
  channelOverwrites!: Backup.RoleOverwrites[];

  @prop({ type: () => [String], required: true })
  members!: string[];

  @prop({ type: () => Boolean, required: true })
  hoist!: boolean;

  @prop({ type: () => Boolean, required: true })
  mentionable!: boolean;
}

export const RoleModel = getModelForClass(RoleSchema);
