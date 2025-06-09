import { ExtractJwt, Strategy, StrategyOptions} from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service'; // 假设 UserService 位于 src/user/user.service.ts

/**
 * 定义 JWT 载荷的接口。
 * 这应该与您在 AuthService 中生成 JWT 时使用的载荷结构一致。
 */
export interface JwtPayload {
    sub: number; // 'sub' (subject) 通常用来存储用户ID
    email: string; // 或者 username，取决于您放入JWT的内容
    // 您可以根据需要在 JWT 载荷中添加其他字段，例如角色等
    // roles?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') { // 明确策略名称为 'jwt'
    constructor(
        private configService: ConfigService,
        private userService: UserService, // 注入 UserService 以便根据 payload 中的 ID 获取用户信息
    ) {

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),// 使用 getOrThrow
            passReqToCallback: false,
        } as StrategyOptions);

    }

    /**
     * 4. 实现 validate 方法
     * Passport 首先会使用 secretOrKey 验证 JWT 的签名和是否过期。
     * 如果 JWT 有效，Passport 会解码 JWT 的 payload，然后调用此 validate 方法，并将解码后的 payload 作为参数传入。
     * @param payload 解码后的 JWT 载荷
     * @returns 如果用户有效，返回用户对象；否则应抛出异常。
     */
    async validate(payload: JwtPayload): Promise<any> {
        console.log(`JwtStrategy: Validating JWT payload - `, payload); // 用于调试

        // 我们从 payload 中获取用户 ID (这里假设存储在 'sub' 字段)
        const userId = payload.sub;
        if (!userId) {
            throw new UnauthorizedException('无效的令牌 (用户ID缺失)');
        }

        // 根据用户 ID 从数据库中查找用户
        // 这样做是为了确保用户仍然存在，并且可以获取最新的用户信息
        // 同时，这也是一个检查用户是否被禁用等状态的好地方
        const user = await this.userService.findOneById(userId); // 假设 UserService 有 findOneById 方法

        if (!user) {
            throw new UnauthorizedException('用户不存在或令牌无效');
        }

        // （可选）检查用户状态，例如是否被禁用
        // if (user.status === UserStatusEnum.SUSPENDED) { // UserStatusEnum 需要从 User实体 或共享文件导入
        //   throw new UnauthorizedException('用户账户已被禁用');
        // }

        // 如果验证成功，返回的用户对象将被 Passport 附加到请求对象上 (req.user)
        // !! 重要：确保不要返回敏感信息，如密码哈希 !!
        // 理想情况下，userService.findOneById 方法返回的用户对象就不应包含密码哈希
        // 如果 userService.findOneById 返回了包含 passwordHash 的完整用户实体，
        // 你需要在这里将其移除：
        // const { passwordHash, ...result } = user;
        // return result;

        // 假设 userService.findOneById 返回的是不含敏感信息的用户对象或DTO
        return user;
    }
}