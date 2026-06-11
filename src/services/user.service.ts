import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { QueryUserDto } from '../dto/user/query_user.dto';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository
    ) { }

    async getUser(query: QueryUserDto) {

        return this.userRepository.findAll(query)


    }


}