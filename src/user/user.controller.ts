// 你需要修改成这样 (正确示范):
import { Controller, Get } from '@nestjs/common'; // 确保导入了 Controller

@Controller('users') // <<--- 加上这个装饰器！ 'users' 是这个控制器下所有路由的基础路径
export class UserController {
    @Get() // 这个路由会匹配 GET /users
    findAll() {
        return '这个操作会返回所有用户';
    }

    @Get(':id') // 这个路由会匹配 GET /users/任意ID
    findOne() {
        return '这个操作会返回单个用户';
    }
}