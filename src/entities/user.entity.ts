export class UserEntity {
  id: string | undefined;
  username: string | undefined;
  email: string | undefined;
  password?: string;
  accountType: string | undefined;
  name: string | null | undefined;
  dob?: Date | string | null;
  gender?: string | null;
  jobTitle?: string | null;
  roles?: string[];
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  address?: string | null;
  avatar?: string | null;
  enterprise?: any;
  isActive: boolean | undefined;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
}
