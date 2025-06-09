// src/user/user.service.ts
import {
    Injectable,
    NotFoundException,
    InternalServerErrorException, // 1. 导入 InternalServerErrorException
    ConflictException,            // 2. 导入 ConflictException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatusEnum } from './entities/user.entity'; // 确保导入 User 和 UserStatusEnum (如果 User 实体中用到了)

/**
 * (可选但推荐) 定义传递给 create 方法的数据类型。
 * 这确保了 passwordHash 被包含，并可以指明哪些字段是必需的或可选的。
 * 移除了数据库自动生成或有默认值的字段，除非你想在创建时覆盖它们。
 */
type UserCreationData = Pick<User, 'email' | 'passwordHash' | 'nickname'> & // nickname 来自 RegisterUserDto, 且在 User 实体中
    Partial<Pick<User, 'firstName' | 'lastName' | 'avatarUrl' | 'bio' | 'phoneNumber'>>;
// 根据您的 User 实体和 RegisterUserDto，可以调整这里的 Pick 和 Partial

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) {}

    /**
     * 供 AuthService 的 validateUser 方法调用。
     * 根据邮箱查找用户，并且 *必须* 返回包含 passwordHash 的用户实体。
     * @param email 用户的邮箱
     * @returns 包含 passwordHash 的用户实体，如果找不到则返回 null。
     */
    async findOneByEmailWithPasswordHash(email: string): Promise<User | null> {
        // 假设 User 实体的 passwordHash 列没有设置 { select: false }
        const user = await this.usersRepository.findOne({ where: { email } });
        return user;

        // 如果 User 实体的 passwordHash 列设置了 { select: false }，
        // 则需要使用 QueryBuilder 显式选择 passwordHash，如下面的注释所示：
        /*
        return this.usersRepository
          .createQueryBuilder('user')
          .select([ // 选择所有需要的字段，包括 passwordHash
            'user.id',
            'user.email',
            'user.nickname',
            'user.avatarUrl',
            'user.firstName',
            'user.lastName',
            'user.bio',
            'user.phoneNumber',
            'user.points',
            'user.emailVerifiedAt',
            'user.status',
            'user.roles',
            'user.lastLoginAt',
            'user.createdAt',
            'user.updatedAt',
            'user.passwordHash' // <-- 显式选择 passwordHash
          ])
          .where('user.email = :email', { email })
          .getOne();
        */
    }

    /**
     * 供 JwtStrategy 的 validate 方法调用。
     * 根据用户 ID 查找用户。返回的用户对象 *不应* 包含 passwordHash。
     * @param id 用户 ID
     * @returns 不含 passwordHash 的用户对象，如果找不到则返回 null。
     */
    async findOneById(id: number): Promise<Omit<User, 'passwordHash'> | null> {
        const user = await this.usersRepository.findOneBy({ id });
        if (!user) {
            return null;
        }
        const { passwordHash, ...result } = user;
        return result;
    }

    /**
     * 通用的按邮箱查找用户的方法。
     * 返回的用户对象 *不应* 包含 passwordHash。
     * @param email 用户的邮箱
     * @returns 不含 passwordHash 的用户对象，如果找不到则返回 null。
     */
    async findOneByEmail(email: string): Promise<Omit<User, 'passwordHash'> | null> {
        const user = await this.usersRepository.findOne({ where: { email } });
        if (!user) {
            return null;
        }
        const { passwordHash, ...result } = user;
        return result;
    }

    /**
     * 获取所有用户列表。
     * 返回的用户对象列表 *不应* 包含 passwordHash。
     */
    async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
        const users = await this.usersRepository.find();
        return users.map(user => {
            const { passwordHash, ...result } = user;
            return result;
        });
    }

    /**
     * 创建新用户 - 用于注册功能。
     * @param userData 包含哈希后密码和其他用户信息的数据
     * @returns 创建的已清理的用户对象 (不含 passwordHash)
     */
    async create(userData: UserCreationData): Promise<Omit<User, 'passwordHash'>> {
        try {
            // this.usersRepository.create() 仅在内存中创建实体实例，不执行数据库操作
            const userEntity = this.usersRepository.create(userData);
            // this.usersRepository.save() 执行数据库插入操作
            const savedUser = await this.usersRepository.save(userEntity);

            // 从返回结果中移除 passwordHash
            const { passwordHash, ...result } = savedUser;
            return result;
        } catch (error) {
            // 3. 捕获可能的数据库错误
            console.error("Error saving user in UserService:", error);
            // 检查是否为唯一约束冲突错误 (例如 PostgreSQL 的 '23505')
            // 邮箱唯一性已在 AuthService 中检查，这里主要是针对其他唯一约束，如 nickname
            if (error.code === '23505' || (error.driverError && error.driverError.code === '23505')) {
                throw new ConflictException('创建用户失败，部分信息可能已存在 (例如昵称)。');
            }
            throw new InternalServerErrorException('创建用户时发生数据库错误，请稍后再试。');
        }
    }
}