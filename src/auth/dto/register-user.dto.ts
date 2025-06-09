import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RegisterUserDto {
    @IsNotEmpty({ message: '邮箱不能为空' })
    @IsEmail({}, { message: '请输入有效的邮箱地址' })
    email: string;

    @IsNotEmpty({ message: '密码不能为空' })
    @IsString({ message: '密码必须是字符串' })
    @MinLength(8, { message: '密码长度不能少于8个字符' })
    @MaxLength(50, { message: '密码长度不能超过50个字符' })
        // 可以添加 @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, { message: '密码复杂度不够' }) 等复杂密码校验
    password: string;

    // 根据您的 users SQL schema，nickname 是可选的且唯一
    @IsOptional()
    @IsString({ message: '昵称必须是字符串' })
    @MinLength(2, { message: '昵称长度不能少于2个字符' })
    @MaxLength(100, { message: '昵称长度不能超过100个字符' })
    nickname?: string;

    // 您可以根据需要添加其他注册字段，如 firstName, lastName 等
    // @IsOptional()
    // @IsString()
    // @MaxLength(100)
    // firstName?: string;

    // @IsOptional()
    // @IsString()
    // @MaxLength(100)
    // lastName?: string;
}