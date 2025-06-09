// src/auth/auth.controller.ts
import { Controller, Post, UseGuards, Request as NestRequestDecorator, HttpCode, HttpStatus, Body } from '@nestjs/common'; // 新增 Body
import { AuthService, SanitizedUser } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { RegisterUserDto } from './dto/register-user.dto'; // **** 1. 导入 RegisterUserDto ****

interface AuthenticatedRequest extends Request {
    user: SanitizedUser;
}

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @UseGuards(AuthGuard('local'))
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@NestRequestDecorator() req: AuthenticatedRequest): Promise<{ access_token: string }> {
        return this.authService.login(req.user);
    }

    /**
     * **** 2. 新增用户注册端点 ****
     * 处理 POST /auth/register 请求
     * @param registerUserDto 从请求体验证和提取的注册数据
     * @returns 创建的已清理的用户对象 (不含密码哈希)
     */
    @Post('register')
    @HttpCode(HttpStatus.CREATED) // 注册成功通常返回 201 Created
    async register(@Body() registerUserDto: RegisterUserDto): Promise<SanitizedUser> {
        // ValidationPipe (在 main.ts 中全局设置) 会自动验证 registerUserDto
        return this.authService.register(registerUserDto);
    }
}