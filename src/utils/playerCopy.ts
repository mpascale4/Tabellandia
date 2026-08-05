import { AVATARS } from '../data';
import { AvatarConfig, UserProfile } from '../types';

export type PlayerGender = 'male' | 'female';

const getGenderFromAvatar = (avatar?: Pick<AvatarConfig, 'gender' | 'emoji'> | null): PlayerGender => {
  if (avatar?.gender === 'kid2') return 'female';
  if (avatar?.gender === 'kid1') return 'male';

  const matchedAvatar = AVATARS.find(item => item.emoji === avatar?.emoji);
  return matchedAvatar?.category === 'girl' ? 'female' : 'male';
};

export const getPlayerGender = (profile?: Pick<UserProfile, 'avatar'> | null): PlayerGender => {
  return getGenderFromAvatar(profile?.avatar);
};

export const getGenderedText = (gender: PlayerGender, male: string, female: string) => {
  return gender === 'female' ? female : male;
};
