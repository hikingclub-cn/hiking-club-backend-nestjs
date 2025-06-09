import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') { // 1. 继承自 AuthGuard 并指定 'jwt' 策略
    // 2. (可选) 重写 canActivate 方法以添加自定义逻辑
    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        // 在这里可以添加额外的检查逻辑，例如基于特定条件的IP黑名单等。
        // 对于标准的JWT验证，通常不需要重写此方法，父类的 canActivate 已经足够。
        console.log('JwtAuthGuard: canActivate called'); // 用于调试
        return super.canActivate(context);
    }

    // 3. (可选) 重写 handleRequest 方法以自定义处理认证结果或错误
    handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext, status?: any): TUser {
        // console.log('JwtAuthGuard: handleRequest called'); // 用于调试
        // console.log('Error:', err);
        // console.log('User:', user);
        // console.log('Info:', info); // info 可能包含错误信息，如 TokenExpiredError, JsonWebTokenError

        if (err || !user) {
            // 如果存在错误 (err) 或者 Passport 策略未能验证用户 (user 为 falsey)，则抛出异常。
            // info 对象可能包含更多关于失败原因的细节 (例如 TokenExpiredError)。
            // 您可以根据 info.name 或 info.message 来定制错误响应。
            let message = '未授权的访问';
            if (info && info.name === 'TokenExpiredError') {
                message = '会话已过期，请重新登录。';
            } else if (info && info.name === 'JsonWebTokenError') {
                message = '令牌无效或格式错误。';
            } else if (err && err.message) {
                message = err.message; // 使用错误对象中的消息
            }

            throw err || new UnauthorizedException(message);
        }
        // 如果认证成功，则返回 user 对象，该对象将被注入到请求的 req.user 中。
        return user;
    }
}