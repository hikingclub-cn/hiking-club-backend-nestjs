// src/auth/auth.service.ts
import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common'; // 新增 ConflictException, InternalServerErrorException
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../user/entities/user.entity';
import { RegisterUserDto } from './dto/register-user.dto'; // **** 1. 导入 RegisterUserDto ****
//import { SanitizedUser } from './auth.service'; // 假设 SanitizedUser 已定义

// SanitizedUser 定义 (如果之前没有单独文件或未导出，可以在此文件或共享文件中定义)
export type SanitizedUser = Omit<User, 'passwordHash'>;

@Injectable()
export class AuthService {
    private readonly saltRounds = 10; // bcrypt 加盐轮数

    constructor(
        private userService: UserService,
        private jwtService: JwtService,
    ) {}

    async validateUser(email: string, pass: string): Promise<SanitizedUser | null> {
        const user = await this.userService.findOneByEmailWithPasswordHash(email);
        if (user && user.passwordHash) {
            const isMatch = await bcrypt.compare(pass, user.passwordHash);
            if (isMatch) {
                const { passwordHash, ...result } = user;
                return result as SanitizedUser;
            }
        }
        return null;
    }

    async login(user: SanitizedUser): Promise<{ access_token: string }> {
        const payload = { email: user.email, sub: user.id /*, roles: user.roles */ };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    /**
     * **** 2. 新增用户注册方法 ****
     * @param registerUserDto 用户注册数据
     * @returns 创建的已清理的用户对象 (不含密码哈希)
     */
    async register(registerUserDto: RegisterUserDto): Promise<SanitizedUser> {
        // 步骤 2a: 检查邮箱是否已存在
        const existingUser = await this.userService.findOneByEmail(registerUserDto.email);
        if (existingUser) {
            throw new ConflictException('该邮箱已被注册');
        }

        // 步骤 2b: 哈希密码
        const hashedPassword = await bcrypt.hash(registerUserDto.password, this.saltRounds);

        // 步骤 2c: 准备创建用户的数据
        // 注意：这里我们只传递了 User 实体中定义的字段。
        // User 实体中的 points, status, roles 都有默认值，所以这里不需要显式提供。
        // email_verified_at, last_login_at 是 nullable 且默认为 null。
        const userDataToCreate = {
            email: registerUserDto.email,
            passwordHash: hashedPassword,
            nickname: registerUserDto.nickname, // 如果 DTO 中有 nickname
            // firstName: registerUserDto.firstName, // 如果 DTO 中有
            // lastName: registerUserDto.lastName,   // 如果 DTO 中有
            // 其他来自 DTO 的字段...
        };

        try {
            // 步骤 2d: 调用 UserService 创建用户
            // UserService.create 方法应返回不含密码哈希的用户对象
            const createdUser = await this.userService.create(userDataToCreate);
            return createdUser; // create 方法应该已经处理了密码哈希的移除
        } catch (error) {
            // 可以根据 userService.create 可能抛出的具体错误类型进行更细致的处理
            console.error("Error during user creation in AuthService:", error);
            throw new InternalServerErrorException('用户注册失败，请稍后再试。');
        }
    }
}