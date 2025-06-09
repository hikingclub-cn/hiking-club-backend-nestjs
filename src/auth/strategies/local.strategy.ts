import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service'; // AuthService 将在下一步创建

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
    // 1. 注入 AuthService
    constructor(private authService: AuthService) {
        // 2. 调用 super() 配置 Passport-Local 策略
        super({
            usernameField: 'email', // 明确告知 passport-local 我们用 'email' 字段作为用户名
            // passwordField: 'password' // 'password' 是默认值, 如果你的密码字段名不同, 在此指定
        });
    }

    /**
     * 3. 实现 validate 方法
     * Passport 会在提取到 email 和 password 后自动调用此方法。
     * @param email 从请求体中提取的 email (由 usernameField 配置指定)
     * @param password 从请求体中提取的 password (由 passwordField 配置指定)
     * @returns 如果认证成功，返回用户对象；否则应抛出异常。
     */
    async validate(email: string, password: string): Promise<any> {
        console.log(`LocalStrategy: Validating user with email - ${email}`); // 用于调试
        const user = await this.authService.validateUser(email, password);

        if (!user) {
            // 如果 authService.validateUser 返回 null 或 undefined，说明验证失败
            throw new UnauthorizedException('用户名或密码错误'); // 抛出未授权异常
        }
        // 如果验证成功，返回的用户对象将被 Passport 附加到请求对象上，通常是 req.user
        return user;
    }
}