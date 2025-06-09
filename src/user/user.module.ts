import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity'; // 1. 导入 User 实体
import { UserService } from './user.service';   // 2. 导入 UserService
import { UserController } from './user.controller'; // 3. 导入 UserController

@Module({
    imports: [
        TypeOrmModule.forFeature([User]), // 4. 在 imports 数组中注册 User 实体
                                          // 这使得 User Repository 可以在此模块中被注入
    ],
    providers: [UserService],         // 5. 将 UserService 声明为此模块的提供者
    controllers: [UserController],    // 6. 将 UserController 声明为此模块的控制器
    exports: [UserService],           // 7. (可选但推荐) 导出 UserService，以便其他模块可以注入和使用它
})
export class UserModule {}